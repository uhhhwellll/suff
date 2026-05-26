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
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);

    try {
        // Удаляем завершающий слеш если есть
        const cleanPath = path.replace(/\/$/, '');
        
        // GET /users - получить всех пользователей
        if (req.method === 'GET' && cleanPath === '/users') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, data: users }));
        }
        // GET /users/:id - получить конкретного пользователя
        else if (req.method === 'GET' && cleanPath.match(/^\/users\/(\d+)$/)) {
            const userId = parseInt(cleanPath.split('/')[2]);
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
        // POST /users/add - добавить нового пользователя
        else if (req.method === 'POST' && cleanPath === '/users/add') {
            const body = await parseBody(req);
            
            if (!body.name || !body.email) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Имя и email обязательны' 
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
            
            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Пользователь добавлен',
                data: newUser 
            }));
        }
        // DELETE /users/:id - удалить пользователя
        else if (req.method === 'DELETE' && cleanPath.match(/^\/users\/(\d+)$/)) {
            const userId = parseInt(cleanPath.split('/')[2]);
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                const deletedUser = users.splice(userIndex, 1)[0];
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Пользователь с ID ${userId} удален`,
                    data: deletedUser 
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: `Пользователь с ID ${userId} не найден` 
                }));
            }
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                success: false, 
                message: 'Маршрут не найден' 
            }));
        }
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ 
            success: false, 
            message: error.message 
        }));
    }
});

// Слушаем на всех интерфейсах
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`Сервер запущен на http://82.146.63.187:${PORT}`);
    console.log('='.repeat(60));
    console.log('Доступные endpoints:');
    console.log(`  GET    http://82.146.63.187:${PORT}/users`);
    console.log(`  GET    http://82.146.63.187:${PORT}/users/:id`);
    console.log(`  POST   http://82.146.63.187:${PORT}/users/add`);
    console.log(`  DELETE http://82.146.63.187:${PORT}/users/:id`);
    console.log('='.repeat(60));
});