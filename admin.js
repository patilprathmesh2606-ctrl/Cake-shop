
// Supabase Configuration - UPDATE THESE VALUES!


const SUPABASE_URL = 'https://ivvppceuqblhhbqnyfjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnBwY2V1cWJsaGhicW55ZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTc3ODgsImV4cCI6MjA4Mzk5Mzc4OH0.iM48uGRMQjOVGKqqV7Z3mPGFH4BkWEnZS6T-Zw0dcPs

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// State Management

let currentAdmin = null;
let currentOrderToUpdate = null;
let currentProductToEdit = null;
let ordersChart = null;
let allOrders = [];
let allProducts = [];
let allUsers = [];


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
    
    // Dashboard
    totalRevenue: document.getElementById('totalRevenue'),
    totalOrders: document.getElementById('totalOrders'),
    totalUsers: document.getElementById('totalUsers'),
    recentOrders: document.getElementById('recentOrders'),
    topProducts: document.getElementById('topProducts'),
    
    // Orders
    ordersTable: document.getElementById('ordersTable'),
    
    // Products
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
    
    // Users
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
    console.log('Initializing Admin Dashboard...');
    
    // Add custom styles
    addAdminStyles();
    
    // Check authentication first
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) {
        return; // Redirect will happen in checkAdminAuth
    }
    
    // Setup event listeners
    setupAdminEventListeners();
    
    // Load all data
    await loadDashboardData();
    await loadAllOrders();
    await loadAllProducts();
    await loadAllUsers();
    
    // Setup real-time subscriptions
    setupRealtimeSubscriptions();
    
    console.log('Admin Dashboard initialized successfully');
});


// Custom Styles for Admin

function addAdminStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInLeft {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .animate-fade-in-up {
            animation: fadeInUp 0.4s ease-out;
        }
        
        .animate-slide-in-left {
            animation: slideInLeft 0.3s ease-out;
        }
        
        .tab-content {
            animation: fadeInUp 0.3s ease-out;
        }
        
        .stat-card {
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .table-row {
            transition: all 0.2s ease;
        }
        
        .table-row:hover {
            background-color: #f9fafb;
        }
        
        .status-badge {
            transition: all 0.3s ease;
        }
        
        .status-badge:hover {
            transform: scale(1.05);
        }
        
        .action-btn {
            transition: all 0.2s ease;
        }
        
        .action-btn:hover {
            transform: translateY(-1px);
        }
        
        .scrollbar-admin {
            scrollbar-width: thin;
            scrollbar-color: #db2777 transparent;
        }
        
        .scrollbar-admin::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        
        .scrollbar-admin::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .scrollbar-admin::-webkit-scrollbar-thumb {
            background-color: #db2777;
            border-radius: 3px;
        }
        
        .modal-backdrop {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
        }
    `;
    document.head.appendChild(style);
}


// Authentication Functions

async function checkAdminAuth() {
    console.log('Checking admin authentication...');
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            redirectToLogin();
            return false;
        }
        
        if (!session || !session.user) {
            console.log('No session found, redirecting to login');
            redirectToLogin();
            return false;
        }
        
        currentAdmin = session.user;
        console.log('User found:', currentAdmin.email);
        
        // Check if user has admin profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, is_banned, email, full_name')
            .eq('id', currentAdmin.id)
            .maybeSingle();
        
        if (profileError) {
            console.error('Profile error:', profileError);
            redirectToLogin();
            return false;
        }
        
        if (!profile) {
            console.log('No profile found for user');
            redirectToLogin();
            return false;
        }
        
        if (profile.is_banned) {
            console.log('User is banned');
            await supabase.auth.signOut();
            alert('Your account has been suspended.');
            redirectToLogin();
            return false;
        }
        
        if (!profile.is_admin) {
            console.log('User is not admin');
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return false;
        }
        
        // Update UI with admin info
        if (adminElements.adminEmail) {
            adminElements.adminEmail.textContent = profile.email || currentAdmin.email;
        }
        
        console.log('Admin authentication successful');
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        redirectToLogin();
        return false;
    }
}

function redirectToLogin() {
    console.log('Redirecting to login page');
    window.location.href = 'index.html';
}


// Event Listeners Setup

function setupAdminEventListeners() {
    console.log('Setting up admin event listeners...');
    
    // Tab switching
    adminElements.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = btn.dataset.tab;
            console.log('Switching to tab:', tab);
            switchTab(tab);
        });
    });
    
    // Logout
    if (adminElements.logoutBtn) {
        adminElements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Product form
    if (adminElements.productForm) {
        adminElements.productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Product form submitted');
            handleProductSave(e);
        });
    }
    
    if (adminElements.cancelEdit) {
        adminElements.cancelEdit.addEventListener('click', cancelProductEdit);
    }
    
    // Status modal
    if (adminElements.cancelStatus) {
        adminElements.cancelStatus.addEventListener('click', () => {
            console.log('Canceling status update');
            adminElements.statusModal.classList.add('hidden');
            currentOrderToUpdate = null;
        });
    }
    
    if (adminElements.saveStatus) {
        adminElements.saveStatus.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Saving status update');
            updateOrderStatus();
        });
    }
    
    // Save product button (extra safety)
    if (adminElements.saveProduct) {
        adminElements.saveProduct.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Save product button clicked');
            handleProductSave(e);
        });
    }
    
    console.log('Admin event listeners setup complete');
}


// Tab Management

function switchTab(tab) {
    console.log(`Switching to ${tab} tab`);
    
    // Update active tab button
    adminElements.tabBtns.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('bg-pink-700');
            btn.classList.remove('hover:bg-pink-700');
        } else {
            btn.classList.remove('bg-pink-700');
            btn.classList.add('hover:bg-pink-700');
        }
    });
    
    // Show active tab content
    Object.keys(adminElements.tabContents).forEach(key => {
        if (key === tab) {
            adminElements.tabContents[key].classList.remove('hidden');
            adminElements.tabContents[key].classList.add('animate-fade-in-up');
        } else {
            adminElements.tabContents[key].classList.add('hidden');
            adminElements.tabContents[key].classList.remove('animate-fade-in-up');
        }
    });
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        orders: 'Order Management',
        products: 'Product Management',
        users: 'User Management'
    };
    if (adminElements.pageTitle) {
        adminElements.pageTitle.textContent = titles[tab] || 'Dashboard';
    }
    
    // Load data for the tab if needed
    switch(tab) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'orders':
            loadAllOrders();
            break;
        case 'products':
            loadAllProducts();
            break;
        case 'users':
            loadAllUsers();
            break;
    }
}


// Dashboard Functions

async function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    try {
        // Load all orders for calculations
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('total_amount, status, items, created_at')
            .order('created_at', { ascending: false });
        
        if (ordersError) throw ordersError;
        
        allOrders = orders || [];
        
        // Calculate total revenue
        const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        if (adminElements.totalRevenue) {
            adminElements.totalRevenue.textContent = `$${totalRevenue.toFixed(2)}`;
        }
        
        // Update total orders
        if (adminElements.totalOrders) {
            adminElements.totalOrders.textContent = allOrders.length;
        }
        
        // Load users count
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id');
        
        if (usersError) throw usersError;
        
        allUsers = users || [];
        if (adminElements.totalUsers) {
            adminElements.totalUsers.textContent = allUsers.length;
        }
        
        // Load recent orders
        await loadRecentOrders();
        
        // Load chart data
        await loadChartData();
        
        // Load top products
        await loadTopProducts();
        
        console.log('Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAdminNotification('Error loading dashboard data', 'error');
    }
}

async function loadRecentOrders() {
    try {
        const recentOrders = allOrders.slice(0, 5);
        
        if (!adminElements.recentOrders) return;
        
        if (recentOrders.length === 0) {
            adminElements.recentOrders.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-shopping-bag text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">No recent orders</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="space-y-4">';
        
        recentOrders.forEach(order => {
            const customerName = order.customer_name || 'Unknown';
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
                <div class="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition duration-200 animate-fade-in-up">
                    <div class="flex-1">
                        <div class="font-semibold text-gray-800 truncate">${customerName}</div>
                        <div class="text-sm text-gray-500">${new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold text-gray-800">$${order.total_amount || 0}</div>
                        <span class="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                            ${order.status || 'pending'}
                        </span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        adminElements.recentOrders.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent orders:', error);
        adminElements.recentOrders.innerHTML = '<p class="text-red-500 text-center">Error loading orders</p>';
    }
}

async function loadChartData() {
    try {
        const statusCounts = {
            pending: 0,
            confirmed: 0,
            baking: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };
        
        allOrders.forEach(order => {
            if (statusCounts[order.status] !== undefined) {
                statusCounts[order.status]++;
            }
        });
        
        const ctx = document.getElementById('ordersChart');
        if (!ctx) return;
        
        const canvasCtx = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (ordersChart) {
            ordersChart.destroy();
        }
        
        ordersChart = new Chart(canvasCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Confirmed', 'Baking', 'Shipped', 'Delivered', 'Cancelled'],
                datasets: [{
                    data: [
                        statusCounts.pending,
                        statusCounts.confirmed,
                        statusCounts.baking,
                        statusCounts.shipped,
                        statusCounts.delivered,
                        statusCounts.cancelled
                    ],
                    backgroundColor: [
                        '#fbbf24', // pending - yellow
                        '#60a5fa', // confirmed - blue
                        '#a78bfa', // baking - purple
                        '#818cf8', // shipped - indigo
                        '#34d399', // delivered - green
                        '#f87171'  // cancelled - red
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
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
                                size: 12,
                                family: "'Poppins', sans-serif"
                            },
                            color: '#374151'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#111827',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

async function loadTopProducts() {
    try {
        const productCounts = {};
        
        allOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
           
