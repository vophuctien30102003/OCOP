// ========================================
// TRÉ BÀ ĐỆ - BACKEND SERVER
// ========================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, images) từ thư mục cha
app.use(express.static(path.join(__dirname, '..')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// DATABASE (In-Memory for now)
// ========================================

// Sản phẩm
const products = [
    {
        id: '1',
        name: 'Tré Xâu Gia Truyền',
        price: 85000,
        description: 'Di sản nguyên bản từ 1956. Tré được ủ thủ công trong lá chuối, bọc rơm, lên men tự nhiên.',
        category: 'tre',
        inStock: true,
        unit: 'xâu 10 cái',
        image: 'tre-xau-gia-truyen.jpg'
    },
    {
        id: '2',
        name: 'Tré Trộn Tiện Lợi',
        price: null,
        description: 'Dành cho nhịp sống hiện đại. Hương vị 77 Hải Phòng đã được trộn sẵn với tỷ lệ vàng.',
        category: 'tre',
        inStock: true,
        unit: 'hộp 500g',
        image: 'tre-tron-tien-loi.jpg'
    },
    {
        id: '3',
        name: 'Chả Bò',
        price: 120000,
        description: 'Chả bò dai giòn, thơm nức mũi. Được làm từ thịt bò tươi ngon, giã thủ công.',
        category: 'cha-bo',
        inStock: true,
        unit: 'kg',
        image: 'cha-bo-main.jpg'
    }
];

// Đơn hàng (lưu tạm trong memory)
let orders = [];

// Liên hệ (lưu tạm trong memory)
let contacts = [];

// ========================================
// EMAIL CONFIGURATION
// ========================================

// Cấu hình Nodemailer (sử dụng Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// ========================================
// API ENDPOINTS
// ========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tré Bà Đệ Backend Server is running',
        timestamp: new Date().toISOString()
    });
});

// ========================================
// PRODUCTS ENDPOINTS
// ========================================

// GET: Lấy tất cả sản phẩm
app.get('/api/products', (req, res) => {
    res.json({
        success: true,
        data: products,
        count: products.length
    });
});

// GET: Lấy sản phẩm theo ID
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm'
        });
    }
    
    res.json({
        success: true,
        data: product
    });
});

// ========================================
// ORDERS ENDPOINTS
// ========================================

// POST: Tạo đơn hàng mới
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, phone, email, address, items, totalAmount, note } = req.body;
        
        // Validation
        if (!customerName || !phone || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin đơn hàng'
            });
        }
        
        // Tạo đơn hàng
        const order = {
            id: `ORD${Date.now()}`,
            customerName,
            phone,
            email: email || '',
            address: address || '',
            items,
            totalAmount,
            note: note || '',
            status: 'pending', // pending, confirmed, shipping, completed, cancelled
            createdAt: new Date().toISOString()
        };
        
        orders.push(order);
        
        // Gửi email xác nhận (nếu có cấu hình)
        if (process.env.EMAIL_USER && email) {
            const itemsList = items.map(item => 
                `- ${item.name} x${item.quantity}: ${formatPrice(item.price * item.quantity)}`
            ).join('\n');
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Xác nhận đơn hàng #${order.id} - Tré Bà Đệ`,
                html: `
                    <h2>Cảm ơn quý khách đã đặt hàng tại Tré Bà Đệ!</h2>
                    <p><strong>Mã đơn hàng:</strong> ${order.id}</p>
                    <p><strong>Tên khách hàng:</strong> ${customerName}</p>
                    <p><strong>Số điện thoại:</strong> ${phone}</p>
                    <p><strong>Địa chỉ:</strong> ${address}</p>
                    <br>
                    <h3>Chi tiết đơn hàng:</h3>
                    <pre>${itemsList}</pre>
                    <br>
                    <h3>Tổng tiền: ${formatPrice(totalAmount)}</h3>
                    <br>
                    <p>Chúng tôi sẽ liên hệ với quý khách trong thời gian sớm nhất để xác nhận đơn hàng.</p>
                    <p><strong>Hotline:</strong> 0963 403 222</p>
                    <p><strong>Địa chỉ:</strong> 77 Hải Phòng, P. Thạch Thang, Q. Hải Châu, Đà Nẵng</p>
                    <br>
                    <p>Trân trọng,<br><strong>Tré Bà Đệ - OCOP 4 Sao</strong></p>
                `
            };
            
            try {
                await transporter.sendMail(mailOptions);
                console.log('✅ Đã gửi email xác nhận đơn hàng');
            } catch (emailError) {
                console.error('❌ Lỗi gửi email:', emailError.message);
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công! Chúng tôi sẽ liên hệ với bạn sớm.',
            data: order
        });
        
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi tạo đơn hàng'
        });
    }
});

// GET: Lấy danh sách đơn hàng
app.get('/api/orders', (req, res) => {
    res.json({
        success: true,
        data: orders,
        count: orders.length
    });
});

// GET: Lấy đơn hàng theo ID
app.get('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy đơn hàng'
        });
    }
    
    res.json({
        success: true,
        data: order
    });
});

// ========================================
// CONTACT ENDPOINTS
// ========================================

// POST: Gửi liên hệ
app.post('/api/contact', async (req, res) => {
    try {
        const { name, phone, email, subject, message } = req.body;
        
        // Validation
        if (!name || !phone || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }
        
        // Lưu contact
        const contact = {
            id: `CONTACT${Date.now()}`,
            name,
            phone,
            email: email || '',
            subject,
            message,
            status: 'new', // new, processing, completed
            createdAt: new Date().toISOString()
        };
        
        contacts.push(contact);
        
        // Gửi email thông báo cho admin
        if (process.env.EMAIL_USER) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                subject: `Liên hệ mới từ website - ${subject}`,
                html: `
                    <h2>Có liên hệ mới từ website Tré Bà Đệ</h2>
                    <p><strong>Tên:</strong> ${name}</p>
                    <p><strong>Số điện thoại:</strong> ${phone}</p>
                    <p><strong>Email:</strong> ${email || 'Không có'}</p>
                    <p><strong>Loại yêu cầu:</strong> ${subject}</p>
                    <p><strong>Nội dung:</strong></p>
                    <p>${message}</p>
                    <br>
                    <p><em>Thời gian: ${new Date().toLocaleString('vi-VN')}</em></p>
                `
            };
            
            try {
                await transporter.sendMail(mailOptions);
                console.log('✅ Đã gửi email thông báo liên hệ');
            } catch (emailError) {
                console.error('❌ Lỗi gửi email:', emailError.message);
            }
        }
        
        // Gửi email xác nhận cho khách (nếu có email)
        if (email && process.env.EMAIL_USER) {
            const confirmMail = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Đã nhận được yêu cầu của bạn - Tré Bà Đệ',
                html: `
                    <h2>Cảm ơn bạn đã liên hệ với Tré Bà Đệ!</h2>
                    <p>Chúng tôi đã nhận được yêu cầu của bạn và sẽ phản hồi trong thời gian sớm nhất.</p>
                    <br>
                    <p><strong>Thông tin liên hệ:</strong></p>
                    <p>📞 Hotline: 0963 403 222</p>
                    <p>📍 Địa chỉ: 77 Hải Phòng, P. Thạch Thang, Q. Hải Châu, Đà Nẵng</p>
                    <p>⏰ Giờ mở cửa: 7:00 Sáng - 9:00 Tối (Tất cả các ngày)</p>
                    <br>
                    <p>Trân trọng,<br><strong>Tré Bà Đệ - OCOP 4 Sao</strong></p>
                `
            };
            
            try {
                await transporter.sendMail(confirmMail);
            } catch (emailError) {
                console.error('❌ Lỗi gửi email xác nhận:', emailError.message);
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Đã gửi yêu cầu thành công! Chúng tôi sẽ liên hệ với bạn sớm.',
            data: contact
        });
        
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi gửi yêu cầu'
        });
    }
});

// GET: Lấy danh sách liên hệ
app.get('/api/contacts', (req, res) => {
    res.json({
        success: true,
        data: contacts,
        count: contacts.length
    });
});

// ========================================
// STATISTICS ENDPOINTS (Admin)
// ========================================

// GET: Thống kê tổng quan
app.get('/api/stats', (req, res) => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    
    res.json({
        success: true,
        data: {
            totalOrders,
            totalRevenue,
            pendingOrders,
            completedOrders,
            totalContacts: contacts.length,
            totalProducts: products.length
        }
    });
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint không tồn tại'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   🏆 TRÉ BÀ ĐỆ - BACKEND SERVER              ║
║   📍 OCOP 4 SAO - 77 Hải Phòng               ║
╠═══════════════════════════════════════════════╣
║   ✅ Server is running on port ${PORT}          ║
║   🌐 Website: http://localhost:${PORT}          ║
║   📊 API: http://localhost:${PORT}/api/health   ║
║                                               ║
║   📁 Serving static files from parent folder  ║
╚═══════════════════════════════════════════════╝
    `);
});

module.exports = app;
