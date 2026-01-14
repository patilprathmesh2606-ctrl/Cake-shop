// Supabase Configuration (Same as main app)
const SUPABASE_URL = 'https://ivvppceuqblhhbqnyfjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnBwY2V1cWJsaGhicW55ZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTc3ODgsImV4cCI6MjA4Mzk5Mzc4OH0.iM48uGRMQjOVGKqqV7Z3mPGFH4BkWEnZS6T-Zw0dcPs';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentAdmin = null;
let currentOrderToUpdate = null;
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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    initAdminEventListeners();
    await loadDashboardData();
    await loadAllOrders();
    await loadAllProducts();
    await loadAllUsers();
    
    // Set up real-time subscriptions
    setupRealtimeSubscriptions();
});

// Authentication
async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = '../index.html';
        return;
    }
    
    currentAdmin = session.user;
    
    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentAdmin.id)
        .single();
    
    if (!profile?.is_admin) {
        window.location.href = '../index.html';
        return;
    }
    
    adminElements.adminEmail.textContent = currentAdmin.email;
}

// Event Listeners
function initAdminEventListeners() {
    // Tab switching
    adminElements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Logout
    adminElements.logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '../index.html';
    });
    
    // Product form
    adminElements.productForm.addEventListener('submit', saveProduct);
    adminElements.cancelEdit.addEventListener('click', cancelProductEdit);
    
    // Status modal
    adminElements.cancelStatus.addEventListener('click', () => {
        adminElements.statusModal.classList.add('hidden');
    });
    
    adminElements.saveStatus.addEventListener('click', updateOrderStatus);
}

// Tab switching
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

// Dashboard
async function loadDashboardData() {
    // Load revenue and orders count
    const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status');
    
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
    adminElements.totalRevenue.textContent = `$${totalRevenue.toFixed(2)}`;
    adminElements.totalOrders.textContent = orders?.length || 0;
    
    // Load users count
    const { data: users } = await supabase
        .from('profiles')
        .select('id');
    adminElements.totalUsers.textContent = users?.length || 0;
    
    // Load recent orders
    await loadRecentOrders();
    
    // Load chart data
    await loadChartData();
    
    // Load top products
    await loadTopProducts();
}

async function loadRecentOrders() {
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            *,
            profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (!orders || orders.length === 0) {
        adminElements.recentOrders.innerHTML = '<p class="text-gray-500 text-center py-4">No recent orders</p>';
        return;
    }
    
    let html = '<div class="space-y-3">';
    orders.forEach(order => {
        const customerName = order.profiles?.full_name || order.customer_name;
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            baking: 'bg-purple-100 text-purple-800',
            shipped: 'bg-indigo-100 text-indigo-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        
        html += `
            <div class="flex items-center justify-between p-3 border rounded-lg">
                <div>
                    <div class="font-semibold">${customerName}</div>
                    <div class="text-sm text-gray-500">Order #${order.id.substring(0, 8)}</div>
                </div>
                <div class="text-right">
                    <div class="font-semibold">$${order.total_amount}</div>
                    <span class="text-xs px-2 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}">
                        ${order.status}
                    </span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    adminElements.recentOrders.innerHTML = html;
}

async function loadChartData() {
    const { data: orders } = await supabase
        .from('orders')
        .select('status');
    
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
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

async function loadTopProducts() {
    const { data: orders } = await supabase
        .from('orders')
        .select('items');
    
    const productCounts = {};
    
    orders?.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (!productCounts[item.name]) {
                    productCounts[item.name] = 0;
                }
                productCounts[item.name] += item.quantity;
            });
        }
    });
    
    // Sort by count and take top 5
    const topProducts = Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    if (topProducts.length === 0) {
        adminElements.topProducts.innerHTML = '<p class="text-gray-500 text-center py-4">No product data available</p>';
        return;
    }
    
    let html = '<div class="space-y-3">';
    topProducts.forEach(([name, count]) => {
        html += `
            <div class="flex items-center justify-between p-3 border rounded-lg">
                <div class="font-medium">${name}</div>
                <div class="text-pink-600 font-semibold">${count} sold</div>
            </div>
        `;
    });
    html += '</div>';
    adminElements.topProducts.innerHTML = html;
}

// Order Management
async function loadAllOrders() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            *,
            profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading orders:', error);
        return;
    }
    
    adminElements.ordersTable.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        adminElements.ordersTable.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-gray-500">No orders found</td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        const customerName = order.profiles?.full_name || order.customer_name;
        const customerEmail = order.profiles?.email || order.customer_email;
        const itemsCount = order.items?.length || 0;
        
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            baking: 'bg-purple-100 text-purple-800',
            shipped: 'bg-indigo-100 text-indigo-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        
        row.innerHTML = `
            <td class="p-4">
                <div class="font-mono text-sm">${order.id.substring(0, 8)}...</div>
            </td>
            <td class="p-4">
                <div class="font-medium">${customerName}</div>
                <div class="text-sm text-gray-500">${customerEmail}</div>
            </td>
            <td class="p-4">${itemsCount} item(s)</td>
            <td class="p-4 font-semibold">$${order.total_amount}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-sm ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}">
                    ${order.status}
                </span>
            </td>
            <td class="p-4 text-sm">${new Date(order.created_at).toLocaleDateString()}</td>
            <td class="p-4">
                <div class="flex space-x-2">
                    <button class="update-status-btn bg-pink-100 text-pink-700 px-3 py-1 rounded text-sm hover:bg-pink-200"
                            data-id="${order.id}"
                            data-status="${order.status}">
                        Update
                    </button>
                    <button class="view-order-btn bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                            data-id="${order.id}">
                        View
                    </button>
                </div>
            </td>
        `;
        
        adminElements.ordersTable.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const orderId = e.target.dataset.id;
            const currentStatus = e.target.dataset.status;
            showStatusModal(orderId, currentStatus);
        });
    });
    
    document.querySelectorAll('.view-order-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const orderId = e.target.dataset.id;
            viewOrderDetails(orderId);
        });
    });
}

function showStatusModal(orderId, currentStatus) {
    currentOrderToUpdate = orderId;
    adminElements.newStatus.value = currentStatus;
    adminElements.statusModal.classList.remove('hidden');
}

async function updateOrderStatus() {
    if (!currentOrderToUpdate) return;
    
    const newStatus = adminElements.newStatus.value;
    
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', currentOrderToUpdate);
    
    if (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
        return;
    }
    
    adminElements.statusModal.classList.add('hidden');
    await loadAllOrders();
    await loadDashboardData();
}

async function viewOrderDetails(orderId) {
    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
    
    if (!order) return;
    
    let itemsHTML = '';
    if (order.items && Array.isArray(order.items)) {
        itemsHTML = order.items.map(item => 
            `<li>${item.name} × ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`
        ).join('');
    }
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-xl w-full max-w-2xl mx-4">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold">Order Details</h3>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-gray-500 text-sm">Order ID</label>
                                <p class="font-mono">${order.id}</p>
                            </div>
                            <div>
                                <label class="text-gray-500 text-sm">Date</label>
                                <p>${new Date(order.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <div>
                            <label class="text-gray-500 text-sm">Customer</label>
                            <p>${order.customer_name} (${order.customer_email})</p>
                            <p class="text-sm">Phone: ${order.customer_phone}</p>
                        </div>
                        <div>
                            <label class="text-gray-500 text-sm">Delivery Address</label>
                            <p>${order.delivery_address}</p>
                        </div>
                        <div>
                            <label class="text-gray-500 text-sm">Items</label>
                            <ul class="list-disc pl-5">${itemsHTML}</ul>
                        </div>
                        <div>
                            <label class="text-gray-500 text-sm">Total Amount</label>
                            <p class="text-xl font-bold">$${order.total_amount}</p>
                        </div>
                        ${order.notes ? `
                        <div>
                            <label class="text-gray-500 text-sm">Notes</label>
                            <p>${order.notes}</p>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Product Management
async function loadAllProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading products:', error);
        return;
    }
    
    adminElements.productsTable.innerHTML = '';
    
    if (!products || products.length === 0) {
        adminElements.productsTable.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-gray-500">No products found</td>
            </tr>
        `;
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="p-4">
                <div class="flex items-center">
                    <img src="${product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80'}" 
                         alt="${product.name}" 
                         class="w-12 h-12 object-cover rounded mr-3">
                    <div>
                        <div class="font-medium">${product.name}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">${product.description || 'No description'}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">
                <span class="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                    ${product.category}
                </span>
            </td>
            <td class="p-4 font-semibold">$${product.price}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-sm ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="p-4">
                <div class="flex space-x-2">
                    <button class="edit-product-btn bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                            data-id="${product.id}">
                        Edit
                    </button>
                    <button class="delete-product-btn bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                            data-id="${product.id}"
                            data-name="${pro
