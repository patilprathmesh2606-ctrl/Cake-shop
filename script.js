// Supabase Configuration
const SUPABASE_URL = 'https://ivvppceuqblhhbqnyfjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnBwY2V1cWJsaGhicW55ZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTc3ODgsImV4cCI6MjA4Mzk5Mzc4OH0.iM48uGRMQjOVGKqqV7Z3mPGFH4BkWEnZS6T-Zw0dcPs';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentUser = null;
let shoppingBag = JSON.parse(localStorage.getItem('shoppingBag')) || [];
let products = [];
let currentProduct = null;

// DOM Elements
const elements = {
    // Buttons
    bagBtn: document.getElementById('bagBtn'),
    bagCount: document.getElementById('bagCount'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    authSection: document.getElementById('authSection'),
    guestSection: document.getElementById('guestSection'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    
    // Modals
    productModal: document.getElementById('productModal'),
    bagModal: document.getElementById('bagModal'),
    orderModal: document.getElementById('orderModal'),
    authModal: document.getElementById('authModal'),
    
    // Close buttons
    closeModal: document.getElementById('closeModal'),
    closeBag: document.getElementById('closeBag'),
    closeOrderModal: document.getElementById('closeOrderModal'),
    closeAuthModal: document.getElementById('closeAuthModal'),
    
    // Product modal elements
    modalProductName: document.getElementById('modalProductName'),
    modalProductImage: document.getElementById('modalProductImage'),
    modalProductDescription: document.getElementById('modalProductDescription'),
    modalProductPrice: document.getElementById('modalProductPrice'),
    modalProductCategory: document.getElementById('modalProductCategory'),
    productQty: document.getElementById('productQty'),
    decreaseQty: document.getElementById('decreaseQty'),
    increaseQty: document.getElementById('increaseQty'),
    addToBagBtn: document.getElementById('addToBagBtn'),
    
    // Bag elements
    bagItems: document.getElementById('bagItems'),
    bagTotal: document.getElementById('bagTotal'),
    
    // Order form elements
    orderForm: document.getElementById('orderForm'),
    customerName: document.getElementById('customerName'),
    customerEmail: document.getElementById('customerEmail'),
    customerPhone: document.getElementById('customerPhone'),
    deliveryAddress: document.getElementById('deliveryAddress'),
    deliveryDate: document.getElementById('deliveryDate'),
    orderNotes: document.getElementById('orderNotes'),
    orderSummary: document.getElementById('orderSummary'),
    orderTotal: document.getElementById('orderTotal'),
    
    // Auth elements
    authTitle: document.getElementById('authTitle'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    registerName: document.getElementById('registerName'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    loginSubmit: document.getElementById('loginSubmit'),
    registerSubmit: document.getElementById('registerSubmit'),
    switchToRegister: document.getElementById('switchToRegister'),
    switchToLogin: document.getElementById('switchToLogin'),
    authMessage: document.getElementById('authMessage'),
    
    // Other
    searchInput: document.getElementById('searchInput'),
    categoryBtns: document.querySelectorAll('.categoryBtn'),
    productsGrid: document.getElementById('productsGrid'),
    ordersList: document.getElementById('ordersList')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await checkAuth();
    await loadProducts();
    updateBagUI();
    
    // Check if user is banned
    if (currentUser) {
        await checkIfBanned();
    }
});

// Event Listeners
function initEventListeners() {
    // Bag
    elements.bagBtn.addEventListener('click', () => showModal(elements.bagModal));
    elements.closeBag.addEventListener('click', () => hideModal(elements.bagModal));
    
    // Product Modal
    elements.closeModal.addEventListener('click', () => hideModal(elements.productModal));
    
    // Quantity controls
    elements.decreaseQty.addEventListener('click', () => {
        const current = parseInt(elements.productQty.value);
        if (current > 1) elements.productQty.value = current - 1;
    });
    
    elements.increaseQty.addEventListener('click', () => {
        const current = parseInt(elements.productQty.value);
        elements.productQty.value = current + 1;
    });
    
    // Add to bag
    elements.addToBagBtn.addEventListener('click', addToBag);
    
    // Checkout
    elements.checkoutBtn.addEventListener('click', () => {
        if (shoppingBag.length === 0) {
            alert('Your bag is empty!');
            return;
        }
        
        if (!currentUser) {
            hideModal(elements.bagModal);
            showAuthModal();
            return;
        }
        
        hideModal(elements.bagModal);
        showOrderModal();
    });
    
    // Order modal
    elements.closeOrderModal.addEventListener('click', () => hideModal(elements.orderModal));
    
    // Order form
    elements.orderForm.addEventListener('submit', placeOrder);
    
    // Auth
    elements.loginBtn.addEventListener('click', showAuthModal);
    elements.logoutBtn.addEventListener('click', logout);
    elements.closeAuthModal.addEventListener('click', () => hideModal(elements.authModal));
    elements.switchToRegister.addEventListener('click', () => {
        elements.loginForm.classList.add('hidden');
        elements.registerForm.classList.remove('hidden');
        elements.authTitle.textContent = 'Register';
    });
    elements.switchToLogin.addEventListener('click', () => {
        elements.registerForm.classList.add('hidden');
        elements.loginForm.classList.remove('hidden');
        elements.authTitle.textContent = 'Login';
    });
    elements.loginSubmit.addEventListener('click', login);
    elements.registerSubmit.addEventListener('click', register);
    
    // Search and filter
    elements.searchInput.addEventListener('input', filterProducts);
    elements.categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.categoryBtns.forEach(b => {
                b.classList.remove('bg-pink-600', 'text-white');
                b.classList.add('bg-pink-100', 'text-pink-700');
            });
            btn.classList.remove('bg-pink-100', 'text-pink-700');
            btn.classList.add('bg-pink-600', 'text-white');
            filterProducts();
        });
    });
}

// Modal functions
function showModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Authentication
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await updateUserProfile();
        await loadUserOrders();
        
        // Check if admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .single();
            
        if (profile?.is_admin && currentUser.email === 'admin@cakeshop.com') {
            window.location.href = 'admin.html';
            return;
        }
        
        elements.authSection.classList.remove('hidden');
        elements.guestSection.classList.add('hidden');
        
        // Pre-fill order form
        elements.customerName.value = currentUser.user_metadata?.full_name || '';
        elements.customerEmail.value = currentUser.email || '';
    }
}

async function updateUserProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (!profile) {
        // Create profile if doesn't exist
        await supabase.from('profiles').insert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.user_metadata?.full_name || '',
            is_admin: currentUser.email === 'admin@cakeshop.com'
        });
    }
}

async function checkIfBanned() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', currentUser.id)
        .single();
    
    if (profile?.is_banned) {
        await supabase.auth.signOut();
        currentUser = null;
        alert('Your account has been suspended. Please contact support.');
        window.location.reload();
    }
}

function showAuthModal() {
    elements.authTitle.textContent = 'Login';
    elements.loginForm.classList.remove('hidden');
    elements.registerForm.classList.add('hidden');
    elements.authMessage.classList.add('hidden');
    showModal(elements.authModal);
}

async function login() {
    const email = elements.loginEmail.value;
    const password = elements.loginPassword.value;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        showAuthMessage(error.message, 'error');
        return;
    }
    
    hideModal(elements.authModal);
    window.location.reload();
}

async function register() {
    const name = elements.registerName.value;
    const email = elements.registerEmail.value;
    const password = elements.registerPassword.value;
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name
            }
        }
    });
    
    if (error) {
        showAuthMessage(error.message, 'error');
        return;
    }
    
    showAuthMessage('Registration successful! Please check your email to confirm your account.', 'success');
    
    // Switch to login form after 2 seconds
    setTimeout(() => {
        elements.registerForm.classList.add('hidden');
        elements.loginForm.classList.remove('hidden');
        elements.authTitle.textContent = 'Login';
        elements.loginEmail.value = email;
    }, 2000);
}

function showAuthMessage(message, type) {
    elements.authMessage.textContent = message;
    elements.authMessage.className = `mt-4 text-center ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
    elements.authMessage.classList.remove('hidden');
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    window.location.reload();
}

// Products
async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading products:', error);
        return;
    }
    
    products = data;
    renderProducts(products);
}

function renderProducts(productsToRender) {
    elements.productsGrid.innerHTML = '';
    
    productsToRender.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300';
        productCard.innerHTML = `
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" 
                 alt="${product.name}" 
                 class="w-full h-48 object-cover">
            <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg">${product.name}</h3>
                    <span class="text-pink-600 font-bold">$${product.price}</span>
                </div>
                <p class="text-gray-600 text-sm mb-3">${product.description?.substring(0, 80)}...</p>
                <div class="flex justify-between items-center">
                    <span class="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded">
                        ${product.category}
                    </span>
                    <button class="view-product-btn bg-pink-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-700"
                            data-id="${product.id}">
                        View Details
                    </button>
                </div>
            </div>
        `;
        
        elements.productsGrid.appendChild(productCard);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            const product = products.find(p => p.id === productId);
            if (product) {
                showProductDetails(product);
            }
        });
    });
}

function showProductDetails(product) {
    currentProduct = product;
    elements.modalProductName.textContent = product.name;
    elements.modalProductImage.src = product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
    elements.modalProductDescription.textContent = product.description || 'No description available.';
    elements.modalProductPrice.textContent = `$${product.price}`;
    elements.modalProductCategory.textContent = product.category;
    elements.productQty.value = 1;
    
    showModal(elements.productModal);
}

function filterProducts() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const activeCategory = document.querySelector('.category-btn.bg-pink-600')?.dataset.category || 'all';
    
    let filtered = products;
    
    // Filter by category
    if (activeCategory !== 'all') {
        filtered = filtered.filter(p => p.category === activeCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.description.toLowerCase().includes(searchTerm)
        );
    }
    
    renderProducts(filtered);
}

// Shopping Bag
function addToBag() {
    if (!currentProduct) return;
    
    const quantity = parseInt(elements.productQty.value);
    const existingItem = shoppingBag.find(item => item.id === currentProduct.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        shoppingBag.push({
            ...currentProduct,
            quantity: quantity
        });
    }
    
    saveBag();
    updateBagUI();
    hideModal(elements.productModal);
    
    // Show confirmation
    alert(`${quantity} ${currentProduct.name}(s) added to bag!`);
}

function removeFromBag(productId) {
    shoppingBag = shoppingBag.filter(item => item.id !== productId);
    saveBag();
    updateBagUI();
}

function updateBagUI() {
    // Update count
    const totalItems = shoppingBag.reduce((sum, item) => sum + item.quantity, 0);
    elements.bagCount.textContent = totalItems;
    
    // Update bag modal
    elements.bagItems.innerHTML = '';
    
    if (shoppingBag.length === 0) {
        elements.bagItems.innerHTML = '<p class="text-gray-500 text-center py-8">Your bag is empty</p>';
        elements.bagTotal.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    
    shoppingBag.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'flex items-center border-b py-4';
        itemElement.innerHTML = `
            <div class="flex-1">
                <h4 class="font-semibold">${item.name}</h4>
                <p class="text-gray-600 text-sm">$${item.price} × ${item.quantity}</p>
            </div>
            <div class="text-right">
                <div class="font-semibold">$${itemTotal.toFixed(2)}</div>
                <button class="remove-item-btn text-red-500 text-sm mt-1" data-id="${item.id}">
                    Remove
                </button>
            </div>
        `;
        
        elements.bagItems.appendChild(itemElement);
    });
    
    elements.bagTotal.textContent = `$${total.toFixed(2)}`;
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            removeFromBag(productId);
        });
    });
}

function saveBag() {
    localStorage.setItem('shoppingBag', JSON.stringify(shoppingBag));
}

function showOrderModal() {
    // Update order summary
    let summaryHTML = '';
    let total = 0;
    
    shoppingBag.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        summaryHTML += `
            <div class="flex justify-between text-sm mb-1">
                <span>${item.name} × ${item.quantity}</span>
                <span>$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    elements.orderSummary.innerHTML = summaryHTML;
    elements.orderTotal.textContent = `$${total.toFixed(2)}`;
    
    // Set minimum delivery date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    elements.deliveryDate.min = tomorrow.toISOString().split('T')[0];
    
    showModal(elements.orderModal);
}

// Orders
async function placeOrder(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login to place an order');
        return;
    }
    
    if (shoppingBag.length === 0) {
        alert('Your bag is empty!');
        return;
    }
    
    const orderData = {
        user_id: currentUser.id,
        customer_name: elements.customerName.value,
        customer_email: elements.customerEmail.value,
        customer_phone: elements.customerPhone.value,
        delivery_address: elements.deliveryAddress.value,
        items: shoppingBag,
        total_amount: shoppingBag.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        notes: elements.orderNotes.value,
        status: 'pending'
    };
    
    const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();
    
    if (error) {
        console.error('Error placing order:', error);
        alert('Error placing order. Please try again.');
        return;
    }
    
    // Clear shopping bag
    shoppingBag = [];
    saveBag();
    updateBagUI();
    
    // Trigger recipe download
    triggerRecipeDownload();
    
    // Show success message
    hideModal(elements.orderModal);
    alert('Order placed successfully! Your recipe is downloading...');
    
    // Reload orders
    await loadUserOrders();
}

function triggerRecipeDownload() {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = 'recipe.pdf';
    link.download = 'sweet-dreams-recipe.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function loadUserOrders() {
    if (!currentUser) {
        elements.ordersList.innerHTML = '<p class="text-gray-500 text-center">Please login to view your orders</p>';
        return;
    }
    
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading orders:', error);
        elements.ordersList.innerHTML = '<p class="text-red-500 text-center">Error loading orders</p>';
        return;
    }
    
    if (orders.length === 0) {
        elements.orde
