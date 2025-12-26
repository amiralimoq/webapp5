require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// اتصال به دیتابیس
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

app.get('/', (req, res) => {
    res.send('سرور رویام فعال است (Render)!');
});

// مسیر لاگین
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const { data, error } = await supabase
        .rpc('check_credentials', { my_username: username, my_password: password });

    if (error) return res.status(500).json({ error: error.message });
    if (data === 'invalid') return res.status(401).json({ success: false, message: 'اطلاعات نادرست است' });

    res.json({ success: true, role: data });
});

// مسیر دریافت کارمندان (Admin)
app.get('/api/admin/staff', async (req, res) => {
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// سایر مسیرها را می‌توانید بعداً اینجا اضافه کنید...

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
