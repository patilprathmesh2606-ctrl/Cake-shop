// Add this to the top of script.js and admin.js
// Make sure to load supabaseConfig.js before these scripts in your HTML
const { supabase } = require('./supabaseConfig.js'); // Adjust path if necessary

// Initialize Supabase client
//const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let shoppingBag = JSON.parse(localStorage.getItem('shoppingBag')) || [];
let products = [];
let currentProduct = null;
let currentOrders = [];


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
    
    // Product modal
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
    
    // Order form
    orderForm: document.getElementById('orderForm'),
    customerName: document.getElementById('customerName'),
    customerEmail: document.getElementById('customerEmail'),
    customerPhone: document.getElementById('customerPhone'),
    deliveryAddress: document.getElementById('deliveryAddress'),
    deliveryDate: document.getElementById('deliveryDate'),
    orderNotes: document.getElementById('orderNotes'),
    orderSummary: document.getElementById('orderSummary'),
    orderTotal: document.getElementById('orderTotal'),
    
    // Auth
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

// ==============================================
// Initialize Application
// ==============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Cake Shop Application...');
    
    // Add CSS animations
    addCustomStyles();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Check authentication status
    await checkAuthStatus();
    
    // Load products
    await loadProducts();
    
    // Update shopping bag UI
    updateBagUI();
    
    // Load user orders if logged in
    if (currentUser) {
        await loadUserOrders();
    }
    
    // Setup real-time subscriptions
    setupRealtimeSubscriptions();
    
    console.log('Application initialized successfully');
});


// Custom Styles

function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
        .animate-pulse { animation: pulse 0.5s ease-in-out; }
        
        .product-card {
            transition: all 0.3s ease;
        }
        
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .modal-overlay {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .status-badge {
            transition: all 0.3s ease;
        }
        
        .cart-item-remove {
            transition: all 0.2s ease;
        }
        
        .cart-item-remove:hover {
            transform: scale(1.1);
        }
        
        .notification {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
        }
        
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .scrollbar-thin {
            scrollbar-width: thin;
            scrollbar-color: #f472b6 transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: #f472b6;
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);
}


// Event Listeners Setup

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Shopping bag toggle
    if (elements.bagBtn) {
        elements.bagBtn.addEventListener('click', () => {
            console.log('Opening shopping bag');
            updateBagUI();
            showModal(elements.bagModal);
        });
    }
    
    // Close bag modal
    if (elements.closeBag) {
        elements.closeBag.addEventListener('click', () => hideModal(elements.bagModal));
    }
    
    // Close product modal
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', () => hideModal(elements.productModal));
    }
    
    // Quantity controls
    if (elements.decreaseQty) {
        elements.decreaseQty.addEventListener('click', () => {
            const current = parseInt(elements.productQty.value);
            if (current > 1) elements.productQty.value = current - 1;
        });
    }
    
    if (elements.increaseQty) {
        elements.increaseQty.addEventListener('click', () => {
            const current = parseInt(elements.productQty.value);
            elements.productQty.value = current + 1;
        });
    }
    
    // Add to bag button
    if (elements.addToBagBtn) {
        elements.addToBagBtn.addEventListener('click', () => {
            console.log('Add to bag clicked');
            addToBag();
        });
    }
    
    // Checkout button
    if (elements.checkoutBtn) {
        elements.checkoutBtn.addEventListener('click', () => {
            console.log('Checkout clicked');
            if (shoppingBag.length === 0) {
                showNotification('Your bag is empty! Add some cakes first.', 'warning');
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
    }
    
    // Close order modal
    if (elements.closeOrderModal) {
        elements.closeOrderModal.addEventListener('click', () => hideModal(elements.orderModal));
    }
    
    // Order form submission
    if (elements.orderForm) {
        elements.orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Order form submitted');
            handleOrderSubmit(e);
        });
    }
    
    // Authentication
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            showAuthModal();
        });
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            console.log('Logout button clicked');
            handleLogout();
        });
    }
    
    if (elements.closeAuthModal) {
        elements.closeAuthModal.addEventListener('click', () => hideModal(elements.authModal));
    }
    
    // Switch between login/register forms
    if (elements.switchToRegister) {
        elements.switchToRegister.addEventListener('click', () => {
            elements.loginForm.classList.add('hidden');
            elements.registerForm.classList.remove('hidden');
            elements.authTitle.textContent = 'Register';
            clearAuthMessage();
        });
    }
    
    if (elements.switchToLogin) {
        elements.switchToLogin.addEventListener('click', () => {
            elements.registerForm.classList.add('hidden');
            elements.loginForm.classList.remove('hidden');
            elements.authTitle.textContent = 'Login';
            clearAuthMessage();
        });
    }
    
    // Login submission
    if (elements.loginSubmit) {
        elements.loginSubmit.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            handleLogin();
        });
    }
    
    // Register submission
    if (elements.registerSubmit) {
        elements.registerSubmit.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Register form submitted');
            handleRegister();
        });
    }
    
    // Search and filter
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', filterProducts);
    }
    
    // Category filter buttons
    if (elements.categoryBtns.length > 0) {
        elements.categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button styling
                elements.categoryBtns.forEach(b => {
                    b.classList.remove('bg-pink-600', 'text-white');
                    b.classList.add('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
                });
                btn.classList.remove('bg-pink-100', 'text-pink-700', 'hover:bg-pink-200');
                btn.classList.add('bg-pink-600', 'text-white');
                
                filterProducts();
            });
        });
    }
    
    console.log('Event listeners setup complete');
}


// Authentication Functions

async function checkAuthStatus() {
    console.log('Checking authentication status...');
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            showGuestView();
            return;
        }
        
        if (session && session.user) {
            console.log('User authenticated:', session.user.email);
            currentUser = session.user;
            await handleAuthenticatedUser(session.user);
        } else {
            console.log('No authenticated user found');
            showGuestView();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showGuestView();
    }
}

async function handleAuthenticatedUser(user) {
    console.log('Handling authenticated user:', user.email);
    
    try {
        // Check if user profile exists
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (error) {
            console.error('Profile fetch error:', error);
        }
        
        // Check if user is banned
        if (profile && profile.is_banned) {
            await supabase.auth.signOut();
            showNotification('Your account has been suspended.', 'error');
            showGuestView();
            return;
        }
        
        // Create profile if doesn't exist
        if (!profile) {
            console.log('Creating new profile for user');
            const { error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    is_admin: user.email === 'admin@cakeshop.com'
                });
            
            if (createError) {
                console.error('Error creating profile:', createError);
            }
        }
        
        // Check if user is admin (admin@cakeshop.com)
        if (user.email === 'admin@cakeshop.com') {
            console.log('Admin user detected, checking profile...');
            const { data: adminProfile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('email', 'admin@cakeshop.com')
                .maybeSingle();
            
            if (adminProfile && adminProfile.is_admin && window.location.pathname.includes('index.html')) {
                console.log('Redirecting admin to dashboard');
                window.location.href = 'admin.html';
                return;
            }
        }
        
        // Show authenticated view
        showAuthenticatedView();
        
        // Load user orders
        await loadUserOrders();
        
        // Pre-fill order form
        if (profile && profile.full_name) {
            elements.customerName.value = profile.full_name;
        } else if (user.user_metadata?.full_name) {
            elements.customerName.value = user.user_metadata.full_name;
        }
        if (user.email) {
            elements.customerEmail.value = user.email;
        }
        
    } catch (error) {
        console.error('Error handling authenticated user:', error);
        showGuestView();
    }
}

function showAuthenticatedView() {
    console.log('Showing authenticated view');
    if (elements.authSection) elements.authSection.classList.remove('hidden');
    if (elements.guestSection) elements.guestSection.classList.add('hidden');
    
    // Update orders section message
    if (elements.ordersList) {
        elements.ordersList.innerHTML = `
            <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mb-4"></div>
                <p class="text-gray-500">Loading your orders...</p>
            </div>
        `;
    }
}

function showGuestView() {
    console.log('Showing guest view');
    if (elements.authSection) elements.authSection.classList.add('hidden');
    if (elements.guestSection) elements.guestSection.classList.remove('hidden');
    
    // Update orders section message
    if (elements.ordersList) {
        elements.ordersList.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-user-circle text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">Please login to view your orders</p>
                <button id="loginFromOrders" class="mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition duration-300">
                    Login Now
                </button>
            </div>
        `;
        
        // Add event listener to login button
        setTimeout(() => {
            const loginFromOrdersBtn = document.getElementById('loginFromOrders');
            if (loginFromOrdersBtn) {
                loginFromOrdersBtn.addEventListener('click', showAuthModal);
            }
        }, 100);
    }
}

function showAuthModal() {
    console.log('Showing auth modal');
    if (elements.authTitle) elements.authTitle.textContent = 'Login';
    if (elements.loginForm) elements.loginForm.classList.remove('hidden');
    if (elements.registerForm) elements.registerForm.classList.add('hidden');
    clearAuthMessage();
    showModal(elements.authModal);
}

async function handleLogin() {
    console.log('Handling login...');
    const email = elements.loginEmail ? elements.loginEmail.value.trim() : '';
    const password = elements.loginPassword ? elements.loginPassword.value : '';
    
    if (!email || !password) {
        showAuthMessage('Please enter both email and password', 'error');
        return;
    }
    
    // Show loading state
    if (elements.loginSubmit) {
        elements.loginSubmit.disabled = true;
        elements.loginSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Logging in...';
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error('Login error:', error);
            showAuthMessage(error.message, 'error');
            return;
        }
        
        console.log('Login successful:', data.user.email);
        showNotification('Login successful!', 'success');
        hideModal(elements.authModal);
        
        // Reload page to update state
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Login exception:', error);
        showAuthMessage('An error occurred during login', 'error');
    } finally {
        // Reset button state
        if (elements.loginSubmit) {
            elements.loginSubmit.disabled = false;
            elements.loginSubmit.innerHTML = 'Login';
        }
    }
}

async function handleRegister() {
    console.log('Handling registration...');
    const name = elements.registerName ? elements.registerName.value.trim() : '';
    const email = elements.registerEmail ? elements.registerEmail.value.trim() : '';
    const password = elements.registerPassword ? elements.registerPassword.value : '';
    
    if (!name || !email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Show loading state
    if (elements.registerSubmit) {
        elements.registerSubmit.disabled = true;
        elements.registerSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creating account...';
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
        
        if (error) {
            console.error('Registration error:', error);
            showAuthMessage(error.message, 'error');
            return;
        }
        
        console.log('Registration successful:', data.user?.email);
        showAuthMessage('Registration successful! Please check your email to confirm your account.', 'success');
        
        // Switch to login form after 3 seconds
        setTimeout(() => {
            if (elements.registerForm) elements.registerForm.classList.add('hidden');
            if (elements.loginForm) elements.loginForm.classList.remove('hidden');
            if (elements.authTitle) elements.authTitle.textContent = 'Login';
            if (elements.loginEmail) elements.loginEmail.value = email;
            if (elements.loginPassword) elements.loginPassword.value = '';
            clearAuthMessage();
        }, 3000);
        
    } catch (error) {
        console.error('Registration exception:', error);
        showAuthMessage('An error occurred during registration', 'error');
    } finally {
        // Reset button state
        if (elements.registerSubmit) {
            elements.registerSubmit.disabled = false;
            elements.registerSubmit.innerHTML = 'Register';
        }
    }
}

function showAuthMessage(message, type) {
    if (!elements.authMessage) return;
    
    elements.authMessage.textContent = message;
    elements.authMessage.className = 'mt-4 text-center font-medium animate-fade-in';
    
    if (type === 'error') {
        elements.authMessage.classList.add('text-red-600');
        elements.authMessage.classList.remove('text-green-600');
    } else {
        elements.authMessage.classList.add('text-green-600');
        elements.authMessage.classList.remove('text-red-600');
    }
    
    elements.authMessage.classList.remove('hidden');
}

function clearAuthMessage() {
    if (elements.authMessage) {
        elements.authMessage.classList.add('hidden');
        elements.authMessage.textContent = '';
    }
}

async function handleLogout() {
    console.log('Handling logout...');
    try {
        await supabase.auth.signOut();
        currentUser = null;
        showNotification('Logged out successfully', 'success');
        
        // Clear any user-specific data
        shoppingBag = [];
        localStorage.removeItem('shoppingBag');
        updateBagUI();
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}


// Product Functions

async function loadProducts() {
    console.log('Loading products...');
    
    if (!elements.productsGrid) {
        console.error('Products grid element not found');
        return;
    }
    
    // Show loading state
    elements.productsGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4"></div>
            <p class="text-gray-500">Loading delicious cakes...</p>
        </div>
    `;
    
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading products:', error);
            throw error;
        }
        
        console.log(`Loaded ${data?.length || 0} products`);
        products = data || [];
        
        if (products.length === 0) {
            console.log('No products found, loading sample data');
            await loadSampleProducts();
        } else {
            renderProducts(products);
        }
        
    } catch (error) {
        console.error('Failed to load products:', error);
        
        // Try to load sample products as fallback
        await loadSampleProducts();
        
        showNotification('Could not load products. Using sample data.', 'warning');
    }
}

async function loadSampleProducts() {
    console.log('Loading sample products...');
    
    // Sample product data
    products = [
        {
            id: 'sample-1',
            name: 'Chocolate Dream Cake',
            description: 'Rich chocolate cake with layers of fudge frosting and chocolate ganache. Perfect for chocolate lovers!',
            price: 45.99,
            category: 'Chocolate',
            image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'sample-2',
            name: 'Wedding Bliss Cake',
            description: 'Elegant vanilla cake with buttercream flowers and edible pearls. Perfect for weddings and special occasions.',
            price: 89.99,
            category: 'Wedding',
            image_url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'sample-3',
            name: 'Birthday Fun Cake',
            description: 'Colorful vanilla cake with rainbow sprinkles, buttercream frosting, and birthday candles.',
            price: 39.99,
            category: 'Birthday',
            image_url: 'https://images.unsplash.com/photo-1559620192-032c64bc86af?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'sample-4',
            name: 'Red Velvet Special',
            description: 'Classic red velvet cake with cream cheese frosting and red velvet crumbs decoration.',
            price: 49.99,
            category: 'Special',
            image_url: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'sample-5',
            name: 'Strawberry Delight',
            description: 'Fresh strawberry cake with strawberry filling and whipped cream frosting.',
            price: 42.99,
            category: 'Special',
            image_url: 'https://images.unsplash.com/photo-1508739826987-b79cd8b7da12?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'sample-6',
            name: 'Carrot Cake Supreme',
            description: 'Moist carrot cake with cream cheese frosting and walnut topping.',
            price: 44.99,
            category: 'Special',
            image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60',
            is_active: true,
            created_at: new Date().toISOString()
        }
    ];
    
    renderProducts(products);
}

function renderProducts(productsList) {
    console.log(`Rendering ${productsList.length} products`);
    
    if (!elements.productsGrid) return;
    
    if (productsList.length === 0) {
        elements.productsGrid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i class="fas fa-birthday-cake text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No Cakes Available</h3>
                <p class="text-gray-500">Check back soon for our delicious cakes!</p>
            </div>
        `;
        return;
    }
    
    let productsHTML = '';
    
    productsList.forEach((product, index) => {
        productsHTML += `
            <div class="product-card bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="relative overflow-hidden">
                    <img src="${product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" 
                         alt="${product.name}" 
                         class="w-full h-48 object-cover transform transition duration-500 hover:scale-110"
                         loading="lazy">
                    <div class="absolute top-3 right-3">
                        <span class="bg-pink-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            $${product.price}
                        </span>
                    </div>
                </div>
                <div class="p-5">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-bold text-lg text-gray-800">${product.name}</h3>
                    </div>
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.description || 'Delicious cake made with love and care.'}</p>
                    <div class="flex justify-between items-center">
                        <span class="inline-block bg-pink-50 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full">
                            ${product.category}
                        </span>
                        <button class="view-product-btn bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-300 transform hover:scale-105"
                                data-id="${product.id}">
                            <i class="fas fa-eye mr-2"></i>View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    elements.productsGrid.innerHTML = productsHTML;
    
    // Add event listeners to view buttons
    setTimeout(() => {
        document.querySelectorAll('.view-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                const product = products.find(p => p.id === productId);
                if (product) {
                    showProductDetails(product);
                }
            });
        });
    }, 100);
}

function showProductDetails(product) {
    console.log('Showing product details:', product.name);
    currentProduct = product;
    
    if (elements.modalProductName) elements.modalProductName.textContent = product.name;
    if (elements.modalProductImage) {
        elements.modalProductImage.src = product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
        elements.modalProductImage.alt = product.name;
    }
    if (elements.modalProductDescription) elements.modalProductDescription.textContent = product.description || 'No description available.';
    if (elements.modalProductPrice) elements.modalProductPrice.textContent = `$${product.price}`;
    if (elements.modalProductCategory) elements.modalProductCategory.textContent = product.category;
    if (elements.productQty) elements.productQty.value = 1;
    
    showModal(elements.productModal);
}

function filterProducts() {
    const searchTerm = elements.searchInput ? elements.searchInput.value.toLowerCase() : '';
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
            (p.description && p.description.toLowerCase().includes(searchTerm)) ||
            p.category.toLowerCase().includes(searchTerm)
        );
    }
    
    renderProducts(filtered);
}


// Shopping Bag Functions

function addToBag() {
    if (!currentProduct) {
        console.error('No current product selected');
        return;
    }
    
    const quantity = parseInt(elements.productQty ? elements.productQty.value : 1);
    
    if (isNaN(quantity) || quantity < 1) {
        showNotification('Please enter a valid quantity', 'error');
        return;
    }
    
    console.log(`Adding ${quantity} ${currentProduct.name} to bag`);
    
    const existingItemIndex = shoppingBag.findIndex(item => item.id === currentProduct.id);
    
    if (existingItemIndex !== -1) {
        // Update existing item quantity
        shoppingBag[existingItemIndex].quantity += quantity;
        console.log(`Updated quantity to ${shoppingBag[existingItemIndex].quantity}`);
    } else {
        // Add new item
        shoppingBag.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image_url: currentProduct.image_url,
            category: currentProduct.category,
            quantity: quantity
        });
        console.log('Added new item to bag');
    }
    
    // Save to localStorage
    saveBagToStorage();
    
    // Update UI
    updateBagUI();
    
    // Close modal
    hideModal(elements.productModal);
    
    // Show success notification
    showNotification(`${quantity} ${currentProduct.name}(s) added to your bag!`, 'success');
    
    // Animate bag icon
    if (elements.bagCount) {
        elements.bagCount.classList.add('animate-pulse');
        setTimeout(() => {
            elements.bagCount.classList.remove('animate-pulse');
        }, 500);
    }
}

function removeFromBag(productId) {
    console.log('Removing item from bag:', productId);
    
    shoppingBag = shoppingBag.filter(item => item.id !== productId);
    saveBagToStorage();
    updateBagUI();
    
    showNotification('Item removed from bag', 'info');
}

function updateBagUI() {
    console.log('Updating bag UI');
    
    // Update bag count
    const totalItems = shoppingBag.reduce((sum, item) => sum + item.quantity, 0);
    if (elements.bagCount) {
        elements.bagCount.textContent = totalItems;
        elements.bagCount.classList.toggle('hidden', totalItems === 0);
    }
    
    // Update bag modal content
    if (elements.bagItems) {
        if (shoppingBag.length === 0) {
            elements.bagItems.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-shopping-bag text-5xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">Your Bag is Empty</h3>
                    <p class="text-gray-500 mb-6">Add some delicious cakes to get started!</p>
                    <button class="close-bag-btn bg-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-pink-700 transition duration-300">
                        Continue Shopping
                    </button>
                </div>
            `;
            
            // Add event listener to continue shopping button
            setTimeout(() => {
                const closeBagBtn = document.querySelector('.close-bag-btn');
                if (closeBagBtn) {
                    closeBagBtn.addEventListener('click', () => hideModal(elements.bagModal));
                }
            }, 100);
            
            if (elements.bagTotal) elements.bagTotal.textContent = '$0.00';
            return;
        }
        
        let bagHTML = '<div class="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">';
        let total = 0;
        
        shoppingBag.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            bagHTML += `
                <div class="flex items-center bg-white p-4 rounded-lg border animate-fade-in" style="animation-delay: ${index * 0.05}s">
                    <div class="flex-shrink-0 w-20 h-20 mr-4">
                        <img src="${item.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'}" 
                             alt="${item.name}" 
                             class="w-full h-full object-cover rounded-lg">
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800">${item.name}</h4>
                        <div class="flex items-center mt-1">
                            <span class="text-sm text-gray-600">$${item.price} each</span>
                            <span class="mx-2 text-gray-400">•</span>
                            <span class="text-sm text-gray-600">Qty: ${item.quantity}</span>
                        </div>
                        <div class="mt-2">
                            <span class="text-xs font-medium px-2 py-1 bg-pink-50 text-pink-700 rounded">${item.category}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg text-pink-600">$${itemTotal.toFixed(2)}</div>
                        <button class="cart-item-remove text-red-500 hover:text-red-700 text-sm mt-2 transition duration-300"
                                data-id="${item.id}">
                            <i class="fas fa-trash mr-1"></i>Remove
                        </button>
                    </div>
                </div>
            `;
        });
        
        bagHTML += '</div>';
        
        // Add order summary
        bagHTML += `
            <div class="border-t pt-6 mt-6">
                <div class="space-y-3">
                    <div class="flex justify-between text-lg">
                        <span class="text-gray-700">Subtotal</span>
                        <span class="font-semibold">$${total.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-lg">
                        <span class="text-gray-700">Delivery</span>
                        <span class="font-semibold">${total > 50 ? 'FREE' : '$5.00'}</span>
                    </div>
                    <div class="flex justify-between text-xl font-bold pt-3 border-t">
                        <span>Total</span>
                        <span class="text-pink-600">$${(total > 50 ? total : total + 5).toFixed(2)}</span>
                    </div>
                    ${total < 50 ? `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                        <p class="text-sm text-yellow-800 flex items-center">
                            <i class="fas fa-truck mr-2"></i>
                            Add $${(50 - total).toFixed(2)} more for free delivery!
                        </p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        elements.bagItems.innerHTML = bagHTML;
        
        // Update total
        if (elements.bagTotal) {
            elements.bagTotal.textContent = `$${(total > 50 ? total : total + 5).toFixed(2)}`;
        }
        
        // Add event listeners to remove buttons
        setTimeout(() => {
            document.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.closest('button').dataset.id;
                    removeFromBag(productId);
                });
            });
        }, 100);
    }
}

function saveBagToStorage() {
    localStorage.setItem('shoppingBag', JSON.stringify(shoppingBag));
    console.log('Bag saved to localStorage');
}

function showOrderModal() {
    console.log('Showing order modal');
    
    if (!currentUser) {
        showNotification('Please login to place an order', 'error');
        return;
    }
    
    if (shoppingBag.length === 0) {
        showNotification('Your bag is empty!', 'warning');
        return;
    }
    
    // Calculate totals
    let subtotal = shoppingBag.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let deliveryFee = subtotal > 50 ? 0 : 5;
    let total = subtotal + deliveryFee;
    
    // Update order summary
    let summaryHTML = '<div class="space-y-2">';
    shoppingBag.forEach(item => {
        const itemTotal = item.price * item.quantity;
        summaryHTML += `
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">${item.name} × ${item.quantity}</span>
                <span class="font-medium">$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    summaryHTML += `
        <div class="border-t pt-2 mt-2">
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Subtotal</span>
                <span class="font-medium">$${subtotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Delivery</span>
                <span class="font-medium">${deliveryFee === 0 ? 'FREE' : '$5.00'}</span>
            </div>
        </div>
    `;
    
    if (elements.orderSummary) elements.orderSummary.innerHTML = summaryHTML;
    if (elements.orderTotal) elements.orderTotal.textContent = `$${total.toFixed(2)}`;
    
    // Set minimum delivery date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (elements.deliveryDate) {
        elements.deliveryDate.min = tomorrow.toISOString().split('T')[0];
        
        // Set default delivery date to 3 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        elements.deliveryDate.value = defaultDate.toISOString().split('T')[0];
    }
    
    showModal(elements.orderModal);
}

async function handleOrderSubmit(e) {
    if (e) e.preventDefault();
    
    console.log('Handling order submission...');
    
    if (!currentUser) {
        showNotification('Please login to place an order', 'error');
        return;
    }
    
    if (shoppingBag.length === 0) {
        showNotification('Your bag is empty!', 'warning');
        return;
    }
    
    // Validate form
    const name = elements.customerName ? elements.customerName.value.trim() : '';
    const email = elements.customerEmail ? elements.customerEmail.value.trim() : '';
    const phone = elements.customerPhone ? elements.customerPhone.value.trim() : '';
    const address = elements.deliveryAddress ? elements.deliveryAddress.value.trim() : '';
    const date = elements.deliveryDate ? elements.deliveryDate.value : '';
    
    if (!name || !email || !phone || !address || !date) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Phone validation
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Calculate totals
    const subtotal = shoppingBag.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 50 ? 0 : 5;
    const totalAmount = subtotal + deliveryFee;
    
    const orderData = {
        user_id: currentUser.id,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: address,
        delivery_date: date,
        items: shoppingBag,
        total_amount: totalAmount,
        notes: elements.orderNotes ? elements.orderNotes.value.trim() : '',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    console.log('Submitting order:', orderData);
    
    // Show loading state
    const submitBtn = elements.orderForm ? elements.orderForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Placing Order...';
    }
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
        
        if (error) {
            console.error('Order submission error:', error);
            throw error;
        }
        
        console.log('Order placed successfully:', data);
        
        // Clear shopping bag
        shoppingBag = [];
        saveBagToStorage();
        updateBagUI();
        
        // Trigger recipe download
        triggerRecipeDownload();
        
        // Show success message
        showNotification('Order placed successfully! Your recipe is downloading...', 'success');
        
        // Hide modal
        hideModal(elements.orderModal);
        
        // Reset form
        if (elements.orderForm) elements.orderForm.reset();
        
        // Reload orders
        await loadUserOrders();
        
        // Show order confirmation
        setTimeout(() => {
            showOrderConfirmation(data);
        }, 1000);
        
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification('Error placing order. Please try again.', 'error');
    } finally {
        // Reset button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Place Order';
        }
    }
}

function triggerRecipeDownload() {
    console.log('Triggering recipe download');
    try {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = 'recipe.pdf';
        link.download = 'sweet-dreams-secret-recipe.pdf';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Recipe download triggered');
    } catch (error) {
        console.error('Error triggering download:', error);
        // Fallback: open in new tab
        window.open('recipe.pdf', '_blank');
    }
}

function showOrderConfirmation(order) {
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-2xl w-full max-w-md mx-auto animate-slide-in">
                <div class="p-8 text-center">
                    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-check text-3xl text-green-600"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-3">Order Confirmed!</h3>
                    <p class="text-gray-600 mb-6">
                        Thank you for your order! Your recipe has been downloaded.
                        We'll start preparing your cakes right away.
                    </p>
                    <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <p class="text-sm text-gray-600"><strong>Order ID:</strong> ${order.id.substring(0, 8)}...</p>
                        <p class="text-sm text-gray-600"><strong>Total:</strong> $${order.total_amount}</p>
                        <p class="text-sm text-gray-600"><strong>Status:</strong> <span class="text-yellow-600 font-medium">Pending</span></p>
                    </div>
                    <div class="flex space-x-4">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="flex-1 bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition duration-300">
                            Continue Shopping
                        </button>
                        <a href="#orders"
                           onclick="this.parentElement.parentElement.parentElement.remove()"
                           class="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition duration-300 text-center">
                            View Orders
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Order Functions

async function loadUserOrders() {
    console.log('Loading user orders...');
    
    if (!currentUser) {
        console.log('No user logged in, skipping order load');
        return;
    }
    
    if (!elements.ordersList) {
        console.error('Orders list element not found');
        return;
    }
    
    // Show loading state
    elements.ordersList.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mb-4"></div>
            <p class="text-gray-500">Loading your orders...</p>
        </div>
    `;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading orders:', error);
            throw error;
        }
        
        console.log(`Loaded ${orders?.length || 0} orders`);
        currentOrders = orders || [];
        
        renderOrders(currentOrders);
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        elements.ordersList.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-3xl text-red-300 mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-600 mb-2">Error Loading Orders</h3>
                <p class="text-gray-500">Could not load your orders. Please try again.</p>
                <button onclick="loadUserOrders()" class="mt-4 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition duration-300">
                    <i class="fas fa-redo mr-2"></i>Retry
                </button>
            </div>
        `;
    }
}

function renderOrders(orders) {
    console.log(`Rendering ${orders.length} orders`);
    
    if (orders.length === 0) {
        elements.ordersList.innerHTML = `
            <div class="text-center py-16">
                <i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No Orders Yet</h3>
                <p class="text-gray-500 mb-6">Start shopping to see your orders here!</p>
                <a href="#products" class="bg-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-pink-700 transition duration-300">
                    Browse Cakes
                </a>
            </div>
        `;
        return;
    }
    
    let ordersHTML = '<div class="space-y-6">';
    
    orders.forEach((order, index) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: 'fas fa-clock', text: 'Pending' },
            confirmed: { color: 'bg-blue-100 text-blue-800', icon: 'fas fa-check-circle', text: 'Confirmed' },
            baking: { color: 'bg-purple-100 text-purple-800', icon: 'fas fa-utensils', text: 'Baking' },
            shipped: { color: 'bg-indigo-100 text-indigo-800', icon: 'fas fa-shipping-fast', text: 'Shipped' },
            delivered: { color: 'bg-green-100 text-green-800', icon: 'fas fa-check-circle', text: 'Delivered' },
            cancelled: { color: 'bg-red-100 text-red-800', icon: 'fas fa-times-circle', text: 'Cancelled' }
        };
        
        const status = order.status || 'pending';
        const config = statusConfig[status] || statusConfig.pending;
        
        // Calculate item count
        const itemCount = Array.isArray(order.items) 
            ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
            : 0;
        
        ordersHTML += `
            <div class="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition duration-300 animate-fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                        <h4 class="font-bold text-lg text-gray-800 mb-1">Order #${order.id.substring(0, 8).toUpperCase()}</h4>
                        <p class="text-gray-500 text-sm">
                            <i class="far fa-calendar mr-1"></i>
                            ${new Date(order.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                            at ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                    <div class="mt-3 md:mt-0">
                        <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${config.color}">
                            <i class="${config.icon} mr-2"></i>
                            ${config.text}
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div class="text-center md:text-left">
                        <p class="text-gray-600 text-sm mb-1">Total Amount</p>
                        <p class="text-2xl font-bold text-pink-600">$${order.total_amount || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-gray-600 text-sm mb-1">Items</p>
                        <p class="text-lg font-medium">
                            <i class="fas fa-box text-gray-400 mr-2"></i>
                            ${itemCount} item${itemCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div class="text-center md:text-right">
                        <p class="text-gray-600 text-sm mb-1">Delivery</p>
                        <p class="text-lg font-medium">
                            <i class="fas fa-calendar-day text-gray-400 mr-2"></i>
                            ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not set'}
                        </p>
                    </div>
                </div>
                
                <div class="border-t pt-4">
                    <div class="flex items-start">
                        <i class="fas fa-map-marker-alt text-pink-500 mt-1 mr-3"></i>
                        <div>
                            <p class="font-medium text-gray-800 mb-1">Delivery Address</p>
                            <p class="text-gray-600">${order.delivery_address || 'No address provided'}</p>
                        </div>
                    </div>
                    
                    ${order.notes ? `
                    <div class="mt-4 flex items-start">
                        <i class="fas fa-sticky-note text-pink-500 mt-1 mr-3"></i>
                        <div>
                            <p class="font-medium text-gray-800 mb-1">Special Instructions</p>
                            <p class="text-gray-600">${order.notes}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="mt-4 flex items-start">
                        <i class="fas fa-phone-alt text-pink-500 mt-1 mr-3"></i>
                        <div>
                            <p class="font-medium text-gray-800 mb-1">Contact</p>
                            <p class="text-gray-600">${order.customer_phone || 'No phone provided'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 pt-4 border-t">
                    <button class="view-order-items-btn bg-gray-100 hover:bg-gray-200 text-gray-800 w-full py-2 rounded-lg text-sm font-medium transition duration-300"
                            data-order-id="${order.id}">
                        <i class="fas fa-list mr-2"></i>View Order Items
                    </button>
                </div>
            </div>
        `;
    });
    
    ordersHTML += '</div>';
    elements.ordersList.innerHTML = ordersHTML;
    
    // Add event listeners to view order items buttons
    setTimeout(() => {
        document.querySelectorAll('.view-order-items-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.closest('button').dataset.orderId;
                const order = currentOrders.find(o => o.id === orderId);
                if (order) {
                    showOrderItemsModal(order);
                }
            });
        });
    }, 100);
}

function showOrderItemsModal(order) {
    let itemsHTML = '';
    if (order.items && Array.isArray(order.items)) {
        itemsHTML = order.items.map(item => `
            <div class="flex items-center justify-between py-3 border-b last:border-0">
                <div class="flex items-center">
                    <img src="${item.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80'}" 
                         alt="${item.name}" 
                         class="w-12 h-12 object-cover rounded mr-3">
                    <div>
                        <p class="font-medium">${item.name}</p>
                        <p class="text-sm text-gray-500">${item.category} • Qty: ${item.quantity}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold">$${item.price}</p>
                    <p class="text-sm text-gray-500">$${(item.price * item.quantity).toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    } else {
        itemsHTML = '<p class="text-gray-500 text-center py-4">No items found</p>';
    }
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-2xl w-full max-w-lg mx-auto animate-slide-in">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">Order Items</h3>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="text-gray-500 hover:text-gray-700 transition duration-300">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
                        ${itemsHTML}
                    </div>
                    <div class="mt-6 pt-6 border-t">
                        <div class="flex justify-between items-center">
                            <span class="text-lg font-semibold">Total</span>
                            <span class="text-2xl font-bold text-pink-600">$${order.total_amount || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}


// Real-time Subscriptions

function setupRealtimeSubscriptions() {
    console.log('Setting up real-time subscriptions...');
    
    if (!currentUser) {
        console.log('No user logged in, skipping real-time setup');
        return;
    }
    
    // Subscribe to order updates
    const ordersChannel = supabase
        .channel('user-orders-updates')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                console.log('Real-time order update:', payload);
                loadUserOrders();
            }
        )
        .subscribe((status) => {
            console.log('Orders subscription status:', status);
        });
    
    // Subscribe to product updates
    const productsChannel = supabase
        .channel('products-updates')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'products'
            },
            (payload) => {
                console.log('Real-time product update:', payload);
                loadProducts();
            }
        )
        .subscribe((status) => {
            console.log('Products subscription status:', status);
        });
    
    // Store channels for cleanup if needed
    window.supabaseChannels = {
        orders: ordersChannel,
        products: productsChannel
    };
}


// Utility Functions

function showModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    // Add animation
    setTimeout(() => {
        modal.querySelector('.bg-white')?.classList.add('animate-slide-in');
    }, 10);
}

function hideModal(modal) {
    if (!modal) return;
    
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto';
    
    // Remove animation class
    modal.querySelector('.bg-white')?.classList.remove('animate-slide-in');
}

function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    const types = {
        success: { bg: 'bg-green-500', icon: 'fas fa-check-circle', title: 'Success' },
        error: { bg: 'bg-red-500', icon: 'fas fa-exclamation-circle', title: 'Error' },
        warning: { bg: 'bg-yellow-500', icon: 'fas fa-exclamation-triangle', title: 'Warning' },
        info: { bg: 'bg-blue-500', icon: 'fas fa-info-circle', title: 'Info' }
    };
    
    const config = types[type] || types.info;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 ${config.bg} text-white px-6 py-4 rounded-lg shadow-lg z-[9999] max-w-md animate-slide-in-right`;
    notification.innerHTML = `
        <div class="flex items-start">
            <i class="${config.icon} text-xl mr-3 mt-1"></i>
            <div class="flex-1">
                <h4 class="font-semibold mb-1">${config.title}</h4>
                <p class="text-sm opacity-90">${message}</p>
            </div>
            <button class="ml-4 opacity-70 hover:opacity-100 transition duration-300">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add click to dismiss
    const closeBtn = notification.querySelector('button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('opacity-0', 'translate-x-full', 'transition-all', 'duration-300');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}


// Global Error Handling

window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('An unexpected error occurred. Please try again.', 'error');
});


// Make functions available globally if needed

window.refreshProducts = loadProducts;
window.refreshOrders = loadUserOrders;
window.updateCart = updateBagUI;
window.showAuth = showAuthModal;
