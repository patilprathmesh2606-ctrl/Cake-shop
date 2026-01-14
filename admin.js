// Supabase Configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS

const SUPABASE_URL = 'https://ivvppceuqblhhbqnyfjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnBwY2V1cWJsaGhicW55ZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTc3ODgsImV4cCI6MjA4Mzk5Mzc4OH0.iM48uGRMQjOVGKqqV7Z3mPGFH4BkWEnZS6T-Zw0dcPs

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentAdmin = null;
let currentOrderToUpdate = null;
let currentProductToEdit = null;
let ordersChart = null;

// DOM Elements
const adminElements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    pageTitle: document.getElementById('pageTitle'),
    tabContents: {
        dashboard: document.getElementById('dashboardTab'),
        orders: document.getElementById('ordersTab'),
        products: document.getElementById('productsTab'),
        users: document.getElementById('usersTab')
    },
    
    // Dashboard elements
    totalRevenue: document.getElementById('totalRevenue'),
    totalOrders: document.getElementById('totalOrders'),
    totalUsers: document.getElementById('totalUsers'),
    recentOrders: document.getElementById('recentOrders'),
    topProducts: document.getElementById('topProducts'),
    
    // Orders elements
    ordersTable: document.getElementById('ordersTable'),
    
    // Products elements
    productForm: document.getElementById('productForm'),
    productFormTitle: document.getElementById('productFormTitle'),
    productId: document.getElementById('productId'),
    productName: document.getElementById('productName'),
    productDescription: document.getElementById('productDescription'),
    productPrice: document.getElementById('productPrice'),
    productCategory: document.getElementById('productCategory'),
    productImage: document.getElementById('productImage'),
    saveProduct: document.getElementById('saveProduct'),
    cancelEdit: document.getElementById('cancelEdit'),
    productsTable: document.getElementById('productsTable'),
    
    // Users elements
    usersTable: document.getElementById('usersTable'),
    
    // Status modal
    statusModal: document.getElementById('statusModal'),
    newStatus: document.getElementById('newStatus'),
    cancelStatus: document.getElementById('cancelStatus'),
    saveStatus: document.getElementById('saveStatus'),
    
    // Other
    adminEmail: document.getElementById('adminEmail'),
    logoutBtn: document.getElementById('logoutBtn')
};

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeAdminDashboard();
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        showNotification('Error loading admin dashboard. Please refresh the page.', 'error');
    }
});

async function initializeAdminDashboard() {
    // Check authentication first
    await checkAdminAuth();
    
    // If not authenticated, this function will redirect, so we won't reach here
    setupAdminEventListeners();
    await loadDashboardData();
    await loadAllOrders();
    await loadAllProducts();
    await loadAllUsers();
    
    // Set up real-time subscriptions
    setupRealtimeSubscriptions();
}

// Authentication Functions
async function checkAdminAuth() {
    try {
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error:', sessionError);
            redirectToLogin();
            return;
        }
        
        if (!session) {
            redirectToLogin();
            return;
        }
        
        currentAdmin = session.user;
        
        // Verify admin status
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, is_banned')
            .eq('id', currentAdmin.id)
            .single();
        
        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError);
            redirectToLogin();
            return;
        }
        
        if (profile.is_banned) {
            await supabase.auth.signOut();
            alert('Your admin account has been suspended.');
            redirectToLogin();
            return;
        }
        
        if (!profile.is_admin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
        
        // Update UI with admin info
        adminElements.adminEmail.textContent = currentAdmin.email;
        
    } catch (error) {
        console.error('Auth check error:', error);
        redirectToLogin();
    }
}

function redirectToLogin() {
    // Redirect to main page for login
    window.location.href = 'index.html';
}

// Event Listeners Setup
function setupAdminEventListeners() {
    // Tab switching
    adminElements.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Logout
    adminElements.logoutBtn.addEventListener('click', handleLogout);
    
    // Product form
    adminElements.productForm.addEventListener('submit', handleProductSave);
    adminElements.cancelEdit.addEventListener('click', cancelProductEdit);
    
    // Status modal
    adminElements.cancelStatus.addEventListener('click', () => {
        adminElements.statusModal.classList.add('hidden');
        currentOrderToUpdate = null;
    });
    
    adminElements.saveStatus.addEventListener('click', updateOrderStatus);
}

// Tab Management
function switchTab(tab) {
    // Update active tab button
    adminElements.tabBtns.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('bg-pink-700');
        } else {
            btn.classList.remove('bg-pink-700');
        }
    });
    
    // Show active tab content
    Object.keys(adminElements.tabContents).forEach(key => {
        if (key === tab) {
            adminElements.tabContents[key].classList.remove('hidden');
        } else {
            adminElements.tabContents[key].classList.add('hidden');
        }
    });
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        orders: 'Order Management',
        products: 'Product Management',
        users: 'User Management'
    };
    adminElements.pageTitle.textContent = titles[tab];
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Load total revenue and orders count
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('total_amount, status, items');
        
        if (ordersError) throw ordersError;
        
        const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;
        adminElements.totalRevenue.textContent = `$${totalRevenue.toFixed(2)}`;
        adminElements.totalOrders.textContent = orders?.length || 0;
        
        // Load users count
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id');
        
        if (usersError) throw usersError;
        adminElements.totalUsers.textContent = users?.length || 0;
        
        // Load recent orders
        await loadRecentOrders();
        
        // Load chart data
        await loadChartData();
        
        // Load top products
        await loadTopProducts(orders || []);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function loadRecentOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles(full_name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        renderRecentOrders(orders || []);
    } catch (error) {
        console.error('Error loading recent orders:', error);
        adminElements.recentOrders.innerHTML = '<p class="text-red-500 text-center py-4">Error loading orders</p>';
    }
}

function renderRecentOrders(orders) {
    if (!orders || orders.length === 0) {
        adminElements.recentOrders.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-shopping-bag text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No recent orders</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="space-y-4">';
    orders.forEach(order => {
        const customerName = order.profiles?.full_name || order.customer_name || 'Unknown';
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            baking: 'bg-purple-100 text-purple-800',
            shipped: 'bg-indigo-100 text-indigo-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        
        const statusClass = statusColors[order.status] || 'bg-gray-100 text-gray-800';
        
        html += `
            <div class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">${customerName}</div>
                    <div class="text-sm text-gray-500">Order #${order.id.substring(0, 8)}</div>
                </div>
                <div class="text-right">
                    <div class="font-semibold text-gray-800">$${order.total_amount || 0}</div>
                    <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${order.status || 'pending'}
                    </span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    adminElements.recentOrders.innerHTML = html;
}

async function loadChartData() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('status');
        
        if (error) throw error;
        
        const statusCounts = {
            pending: 0,
            confirmed: 0,
            baking: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };
        
        orders?.forEach(order => {
            if (statusCounts[order.status] !== undefined) {
                statusCounts[order.status]++;
            }
        });
        
        const ctx = document.getElementById('ordersChart').getContext('2d');
        
        if (ordersChart) {
            ordersChart.destroy();
        }
        
        ordersChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#fbbf24', // pending - yellow
                        '#60a5fa', // confirmed - blue
                        '#a78bfa', // baking - purple
                        '#818cf8', // shipped - indigo
                        '#34d399', // delivered - green
                        '#f87171'  // cancelled - red
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

async function loadTopProducts(orders) {
    try {
        const productCounts = {};
        
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (!productCounts[item.name]) {
                        productCounts[item.name] = {
                            name: item.name,
                            count: 0,
                            revenue: 0
                        };
                    }
                    productCounts[item.name].count += item.quantity || 0;
                    productCounts[item.name].revenue += (item.price || 0) * (item.quantity || 0);
                });
            }
        });
        
        // Sort by count and take top 5
        const topProducts = Object.values(productCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        renderTopProducts(topProducts);
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

function renderTopProducts(products) {
    if (!products || products.length === 0) {
        adminElements.topProducts.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-birthday-cake text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No product data available</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="space-y-3">';
    products.forEach((product, index) => {
        const rankColors = ['bg-yellow-500', 'bg-gray-400', 'bg-yellow-700'];
        const rankColor = index < 3 ? rankColors[index] : 'bg-gray-300';
        
        html += `
            <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition duration-200">
                <div class="flex items-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full ${rankColor} text-white text-sm font-bold mr-3">
                        ${index + 1}
                    </span>
                    <div>
                        <div class="font-medium text-gray-800">${product.name}</div>
                        <div class="text-sm text-gray-500">$${product.revenue.toFixed(2)} revenue</div>
                    </div>
                </div>
                <div class="text-pink-600 font-semibold">${product.count} sold</div>
            </div>
        `;
    });
    html += '</div>';
    adminElements.topProducts.innerHTML = html;
}

// Order Management
async function loadAllOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles(full_name, email)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderOrdersTable(orders || []);
    } catch (error) {
        console.error('Error loading orders:', error);
        adminElements.ordersTable.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Error loading orders
                </td>
            </tr>
        `;
    }
}

function renderOrdersTable(orders) {
    adminElements.ordersTable.innerHTML = '';
    
    if (orders.length === 0) {
        adminElements.ordersTable.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-gray-500">
                    <i class="fas fa-shopping-bag text-3xl text-gray-300 mb-2 block"></i>
                    No orders found
                </td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50 transition duration-200';
        
        const customerName = order.profiles?.full_name || order.customer_name || 'Unknown';
        const customerEmail = order.profiles?.email || order.customer_email || '';
        const itemsCount = order.items?.length || 0;
        
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            baking: 'bg-purple-100 text-purple-800',
            shipped: 'bg-indigo-100 text-indigo-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        
        const statusClass = statusColors[order.status] || 'bg-gray-100 text-gray-800';
        
        row.innerHTML = `
            <td class="p-4">
                <div class="font-mono text-sm text-gray-600" title="${order.id}">
                    ${order.id.substring(0, 8)}...
                </div>
            </td>
            <td class="p-4">
                <div class="font-medium text-gray-800">${customerName}</div>
                <div class="text-sm text-gray-500 truncate max-w-xs">${customerEmail}</div>
            </td>
            <td class="p-4">
                <span class="inline-flex items-center justify-center w-6 h-6 bg-pink-100 text-pink-800 rounded-full text-xs font-medium">
                    ${itemsCount}
                </span>
            </td>
            <td class="p-4 font-semibold text-gray-800">$${order.total_amount || 0}</td>
            <td class="p-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClass}">
                    <i class="fas fa-circle mr-2 text-xs"></i>
                    ${order.status || 'pending'}
                </span>
            </td>
            <td class="p-4 text-sm text-gray-600">
                ${new Date(order.created_at).toLocaleDateString()}
                <div class="text-xs text-gray-400">${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </td>
            <td class="p-4">
                <div class="flex space-x-2">
                    <button class="update-status-btn bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded text-sm font-medium transition duration-300 flex items-center"
                            data-id="${order.id}"
                            data-status="${order.status}">
                        <i class="fas fa-edit mr-1"></i>
                        Update
                    </button>
                    <button class="view-order-btn bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm font-medium transition duration-300 flex items-center"
                            data-id="${order.id}">
                        <i class="fas fa-eye mr-1"></i>
                        View
                    </button>
                </div>
            </td>
        `;
        
        adminElements.ordersTable.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', (e) 
