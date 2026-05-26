const http = require('http');
const url = require('url');

// Порт сервера
const PORT = 3000;

// Хранилище пользователей (в памяти)
let users = [
    { id: 1, name: "Иван Иванов", email: "ivan@example.com", age: 25 },
    { id: 2, name: "Мария Петрова", email: "maria@example.com", age: 30 },
    { id: 3, name: "Алексей Сидоров", email: "alex@example.com", age: 28 }
];

let nextId = 4;

// Функция для парсинга JSON тела запроса
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// Создание сервера
const server = http.createServer(async (req, res) => {
    // Настройка CORS для доступа с HTML страницы
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${path}`); // Логирование запросов

    try {
        // Удаляем завершающий слеш если есть
        const cleanPath = path.replace(/\/$/, '');
        
        // GET /users - получить всех пользователей
        if (req.method === 'GET' && cleanPath === '/users') {
            console.log('Getting all users');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, data: users }, null, 2));
        }
        // GET /users/:id - получить конкретного пользователя
        else if (req.method === 'GET' && cleanPath.match(/^\/users\/(\d+)$/)) {
            const userId = parseInt(cleanPath.split('/')[2]);
            console.log(`Getting user with ID: ${userId}`);
            
            const user = users.find(u => u.id === userId);
            
            if (user) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, data: user }, null, 2));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: `Пользователь с ID ${userId} не найден`,
                    availableIds: users.map(u => u.id)
                }, null, 2));
            }
        }
        // POST /users/add - добавить нового пользователя
        else if (req.method === 'POST' && cleanPath === '/users/add') {
            console.log('Adding new user');
            const body = await parseBody(req);
            
            if (!body.name || !body.email) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Имя и email обязательны',
                    receivedData: body
                }, null, 2));
                return;
            }

            const newUser = {
                id: nextId++,
                name: body.name,
                email: body.email,
                age: body.age || null
            };

            users.push(newUser);
            console.log(`User added:`, newUser);
            
            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Пользователь успешно добавлен',
                data: newUser,
                totalUsers: users.length
            }, null, 2));
        }
        // DELETE /users/:id - удалить пользователя
        else if (req.method === 'DELETE' && cleanPath.match(/^\/users\/(\d+)$/)) {
            const userId = parseInt(cleanPath.split('/')[2]);
            console.log(`Deleting user with ID: ${userId}`);
            
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                const deletedUser = users.splice(userIndex, 1)[0];
                console.log(`User deleted:`, deletedUser);
                
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Пользователь с ID ${userId} успешно удален`,
                    data: deletedUser,
                    remainingUsers: users.length
                }, null, 2));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: `Пользователь с ID ${userId} не найден`,
                    availableIds: users.map(u => u.id)
                }, null, 2));
            }
        }
        // Корневой путь - информация о API
        else if (req.method === 'GET' && cleanPath === '') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                message: 'API Users Server',
                version: '1.0.0',
                endpoints: {
                    getAllUsers: `GET http://82.146.63.187:${PORT}/users`,
                    getUserById: `GET http://82.146.63.187:${PORT}/users/:id`,
                    addUser: `POST http://82.146.63.187:${PORT}/users/add`,
                    deleteUser: `DELETE http://82.146.63.187:${PORT}/users/:id`
                },
                currentUsers: users
            }, null, 2));
        }
        else {
            console.log(`Route not found: ${req.method} ${cleanPath}`);
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                success: false, 
                message: `Маршрут ${req.method} ${cleanPath} не найден`,
                availableEndpoints: [
                    `GET /users`,
                    `GET /users/:id`,
                    `POST /users/add`,
                    `DELETE /users/:id`
                ]
            }, null, 2));
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'Внутренняя ошибка сервера',
            error: error.message 
        }, null, 2));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`🚀 Сервер запущен на http://82.146.63.187:${PORT}`);
    console.log('='.repeat(60));
    console.log('📋 Доступные endpoints:');
    console.log(`  GET    http://82.146.63.187:${PORT}/users          - Все пользователи`);
    console.log(`  GET    http://82.146.63.187:${PORT}/users/1        - Пользователь по ID`);
    console.log(`  POST   http://82.146.63.187:${PORT}/users/add      - Добавить пользователя`);
    console.log(`  DELETE http://82.146.63.187:${PORT}/users/1       - Удалить пользователя`);
    console.log('='.repeat(60));
    console.log('📊 Начальные данные:');
    users.forEach(user => {
        console.log(`  ID: ${user.id}, Имя: ${user.name}, Email: ${user.email}`);
    });
    console.log('='.repeat(60));
});