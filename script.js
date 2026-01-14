// Supabase Configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://ivvppceuqblhhbqnyfjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnBwY2V1cWJsaGhicW55ZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTc3ODgsImV4cCI6MjA4Mzk5Mzc4OH0.iM48uGRMQjOVGKqqV7Z3mPGFH4BkWEnZS6T-Zw0dcPs';


// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
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
    categoryBtns: document.querySelectorAll('.category-btn'),
    productsGrid: document.getElementById('productsGrid'),
    ordersList: document.getElementById('ordersList')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error loading application. Please refresh the page.', 'error');
    }
});

async function initializeApp() {
    setupEventListeners();
    await checkAuthStatus();
    await loadProducts();
    updateBagUI();
    
    // Set up real-time subscription for order updates
    setupRealtimeSubscriptions();
}

// Event Listeners Setup
function setupEventListeners() {
    // Shopping bag
    elements.bagBtn.addEventListener('click', () => {
        updateBagUI();
        showModal(elements.bagModal);
    });
    
    elements.closeBag.addEventListener('click', () => hideModal(elements.bagModal));
    
    // Product modal
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
            showNotification('Your bag is empty!', 'warning');
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
    elements.orderForm.addEventListener('submit', handleOrderSubmit);
    
    // Authentication
    elements.loginBtn.addEventListener('click', showAuthModal);
    elements.logoutBtn.addEventListener('click', handleLogout);
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
    
    elements.loginSubmit.addEventListener('click', handleLogin);
    elements.registerSubmit.addEventListener('click', handleRegister);
    
    // Search and filter
    elements.searchInput.addEventListener('input', filterProducts);
    
    elements.categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button styling
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

// Authentication Functions
async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            return;
        }
        
        if (session) {
            currentUser = session.user;
            await handleUserSession(session.user);
        } else {
            showGuestView();
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

async function handleUserSession(user) {
    // Check if user is banned
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_banned, is_admin')
        .eq('id', user.id)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Profile fetch error:', error);
    }
    
    if (profile?.is_banned) {
        await supabase.auth.signOut();
        showNotification('Your account has been suspended.', 'error');
        window.location.reload();
        return;
    }
    
    // Create profile if doesn't exist
    if (!profile) {
        await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            is_admin: user.email === 'admin@cakeshop.com'
        });
    }
    
    // Redirect admin to admin dashboard
    if (user.email === 'admin@cakeshop.com' && window.location.pathname.includes('index.html')) {
        window.location.href = 'admin.html';
        return;
    }
    
    // Show authenticated view
    showAuthenticatedView();
    
    // Load user orders
    await loadUserOrders();
    
    // Pre-fill order form with user info
    if (profile?.full_name) {
        elements.customerName.value = profile.full_name;
    } else if (user.user_metadata?.full_name) {
        elements.customerName.value = user.user_metadata.full_name;
    }
    elements.customerEmail.value = user.email || '';
}

function showAuthenticatedView() {
    elements.authSection.classList.remove('hidden');
    elements.guestSection.classList.add('hidden');
    elements.ordersList.innerHTML = '<p class="text-gray-500 text-center py-4">Loading orders...</p>';
}

function showGuestView() {
    elements.authSection.classList.add('hidden');
    elements.guestSection.classList.remove('hidden');
    elements.ordersList.innerHTML = '<p class="text-gray-500 text-center py-4">Please login to view your orders</p>';
}

function showAuthModal() {
    elements.authTitle.textContent = 'Login';
    elements.loginForm.classList.remove('hidden');
    elements.registerForm.classList.add('hidden');
    elements.authMessage.classList.add('hidden');
    showModal(elements.authModal);
}

async function handleLogin() {
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;
    
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showNotification('Login successful!', 'success');
        hideModal(elements.authModal);
        window.location.reload();
    } catch (error) {
        showAuthMessage(error.message, 'error');
    }
}

async function handleRegister() {
    const name = elements.registerName.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    
    if (!name || !email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        
        if (error) throw error;
        
        showAuthMessage('Registration successful! Please check your email to confirm your account.', 'success');
        
        // Switch to login form
        setTimeout(() => {
            elements.registerForm.classList.add('hidden');
            elements.loginForm.classList.remove('hidden');
            elements.authTitle.textContent = 'Login';
            elements.loginEmail.value = email;
            elements.loginPassword.value = '';
        }, 3000);
    } catch (error) {
        showAuthMessage(error.message, 'error');
    }
}

function showAuthMessage(message, type) {
    elements.authMessage.textContent = message;
    elements.authMessage.className = `mt-4 text-center ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
    elements.authMessage.classList.remove('hidden');
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        shoppingBag = [];
        localStorage.removeItem('shoppingBag');
        showNotification('Logged out successfully', 'success');
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Product Functions
async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        products = data || [];
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function renderProducts(productsList) {
    elements.productsGrid.innerHTML = '';
    
    if (productsList.length === 0) {
        elements.productsGrid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500">No products found</p>
            </div>
        `;
        return;
    }
    
    productsList.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 transform hover:-translate-y-1';
        productCard.innerHTML = `
            <div class="relative overflow-hidden">
                <img src="${product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" 
                     alt="${product.name}" 
                     class="w-full h-48 object-cover hover:scale-105 transition duration-300">
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg text-gray-800">${product.name}</h3>
                    <span class="text-pink-600 font-bold text-lg">$${product.price}</span>
                </div>
                <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description || 'No description available.'}</p>
                <div class="flex justify-between items-center">
                    <span class="inline-block bg-pink-100 text-pink-800 text-xs px-3 py-1 rounded-full font-medium">
                        ${product.category}
                    </span>
                    <button class="view-product-btn bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-300"
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
    elements.modalProductImage.alt = product.name;
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
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }
    
    renderProducts(filtered);
}

// Shopping Bag Functions
function addToBag() {
    if (!currentProduct) return;
    
    const quantity = parseInt(elements.productQty.value);
    const existingItemIndex = shoppingBag.findIndex(item => item.id === currentProduct.id);
    
    if (existingItemIndex !== -1) {
        shoppingBag[existingItemIndex].quantity += quantity;
    } else {
        shoppingBag.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image_url: currentProduct.image_url,
            quantity: quantity
        });
    }
    
    saveBagToStorage();
    updateBagUI();
    hideModal(elements.productModal);
    
    showNotification(`${quantity} ${currentProduct.name}(s) added to bag!`, 'success');
}

function removeFromBag(productId) {
    shoppingBag = shoppingBag.filter(item => item.id !== productId);
    saveBagToStorage();
    updateBagUI();
}

function updateBagUI() {
    // Update bag count
    const totalItems = shoppingBag.reduce((sum, item) => sum + item.quantity, 0);
    elements.bagCount.textContent = totalItems;
    
    // Update bag modal content
    elements.bagItems.innerHTML = '';
    
    if (shoppingBag.length === 0) {
        elements.bagItems.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-shopping-bag text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">Your bag is empty</p>
                <p class="text-gray-400 text-sm mt-2">Add some delicious cakes!</p>
            </div>
        `;
        elements.bagTotal.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    
    shoppingBag.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'flex items-center border-b py-4 last:border-0';
        itemElement.innerHTML = `
            <div class="flex-shrink-0 w-16 h-16 mr-4">
                <img src="${item.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'}" 
                     alt="${item.name}" 
                     class="w-full h-full object-cover rounded">
            </div>
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${item.name}</h4>
                <p class="text-gray-600 text-sm">$${item.price} × ${item.quantity}</p>
            </div>
            <div class="text-right">
                <div class="font-semibold text-lg">$${itemTotal.toFixed(2)}</div>
                <button class="remove-item-btn text-red-500 hover:text-red-700 text-sm mt-1 transition duration-300"
                        data-id="${item.id}">
                    <i class="fas fa-trash mr-1"></i>Remove
                </button>
            </div>
        `;
        
        elements.
