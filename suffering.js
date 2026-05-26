const http = require('http');
const url = require('url');

const PORT = 3000;

let users = [
    { id: 1, name: "Иван Иванов", email: "ivan@example.com", age: 25 },
    { id: 2, name: "Мария Петрова", email: "maria@example.com", age: 30 },
    { id: 3, name: "Алексей Сидоров", email: "alex@example.com", age: 28 }
];

let nextId = 4;

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

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');


    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const pathParts = path.split('/').filter(part => part);

    console.log(`${req.method} ${path}`);

    try {

        if (req.method === 'GET' && path === '/users') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, data: users, count: users.length }));
        }

        else if (req.method === 'GET' && pathParts[0] === 'users' && pathParts.length === 2) {
            const userId = parseInt(pathParts[1]);

            if (isNaN(userId)) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: 'Неверный формат ID' }));
                return;
            }
            
            const user = users.find(u => u.id === userId);
            
            if (user) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, data: user }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: `Пользователь с ID ${userId} не найден`,
                    availableIds: users.map(u => u.id)
                }));
            }
        }

        else if (req.method === 'POST' && path === '/users/add') {
            const body = await parseBody(req);
            
            if (!body.name || !body.email) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Имя и email обязательны',
                    receivedData: body
                }));
                return;
            }

            if (users.some(u => u.email === body.email)) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Пользователь с таким email уже существует',
                    email: body.email
                }));
                return;
            }

            const newUser = {
                id: nextId++,
                name: body.name,
                email: body.email,
                age: body.age || null
            };

            users.push(newUser);
            
            console.log('Добавлен новый пользователь:', newUser);
            
            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Пользователь успешно добавлен',
                data: newUser,
                totalUsers: users.length
            }));
        }
        else if (req.method === 'DELETE' && pathParts[0] === 'users' && pathParts.length === 2) {
            const userId = parseInt(pathParts[1]);
             
            if (isNaN(userId)) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: 'Неверный формат ID' }));
                return;
            }
            
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                const deletedUser = users.splice(userIndex, 1)[0];
                console.log('Удален пользователь:', deletedUser);
                
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Пользователь ${deletedUser.name} успешно удален`,
                    data: deletedUser,
                    remainingUsers: users.length
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: `Пользователь с ID ${userId} не найден`,
                    availableIds: users.map(u => u.id)
                }));
            }
        }
        else if (req.method === 'GET' && path === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                message: 'API сервер пользователей',
                version: '1.0.0',
                endpoints: {
                    getAllUsers: `GET http://82.146.63.187:${PORT}/users`,
                    getUserById: `GET http://82.146.63.187:${PORT}/users/1`,
                    addUser: `POST http://82.146.63.187:${PORT}/users/add`,
                    deleteUser: `DELETE http://82.146.63.187:${PORT}/users/1`
                },
                currentUsers: users.length,
                userList: users
            }));
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                success: false, 
                message: `Маршрут ${req.method} ${path} не найден`,
                availableEndpoints: [
                    `GET /users`,
                    `GET /users/:id`,
                    `POST /users/add`,
                    `DELETE /users/:id`
                ]
            }));
        }
    } catch (error) {
        console.error('Ошибка сервера:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'Внутренняя ошибка сервера',
            error: error.message 
        }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`Сервер запущен успешно!`);
    console.log('='.repeat(50));
    console.log(`Адрес: http://82.146.63.187:${PORT}`);
    console.log(`Локальный: http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('Доступные endpoints:');
    console.log(`  1. GET    http://82.146.63.187:${PORT}/users`);
    console.log(`  2. GET    http://82.146.63.187:${PORT}/users/1`);
    console.log(`  3. POST   http://82.146.63.187:${PORT}/users/add`);
    console.log(`  4. DELETE http://82.146.63.187:${PORT}/users/1`);
    console.log('='.repeat(50));
    console.log('Для тестирования откройте index.html в браузере');
    console.log('='.repeat(50));
});