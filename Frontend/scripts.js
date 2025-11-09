const BASE_URL = 'http://127.0.0.1:8000';
const LOGIN_URL = BASE_URL + '/api/login/';
const REGISTER_URL = BASE_URL + '/api/users/register/';
const LOGOUT_URL = BASE_URL + '/api/logout/';
const GET_ME = BASE_URL + '/api/me/';
const GET_CONVERSATION_ID_FROM_USER_ID = (userId) => BASE_URL + `/api/conversations/user/?to_user_id=${userId}`;
const SEND_MESSAGE_URL = BASE_URL + '/api/send-message/';
const GET_FRIENDS_URL = BASE_URL + '/api/users/';
const GET_CONVERSATIONS_URL = BASE_URL + '/api/conversations/';
const WS_BASE_URL = 'ws://127.0.0.1:8000';
const WS_URL = WS_BASE_URL + '/ws/chat/';
const CONVERSATION_MESSAGE_URL = (conversationId) => BASE_URL + `/api/conversations/${conversationId}/messages/`;

// Đợi cho tất cả HTML được tải xong
document.addEventListener('DOMContentLoaded', async () => {

    // --- Lấy các phần tử DOM ---
    const loginPage = document.getElementById('login-page');
    const chatApp = document.getElementById('chat-app');
    
    const loginForm = document.getElementById('login-form');
    const registerButton = document.getElementById('register-button');
    
    const friendsBtn = document.getElementById('friends-btn');
    const convosBtn = document.getElementById('convos-btn');
    const listContainer = document.getElementById('list-container');
    
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messageList = document.getElementById('message-list');
    
    // Lấy các phần tử mới
    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const currentChatTopic = document.getElementById('current-chat-topic');
    
    // Lưu conversationId hiện tại
    let currentConversationId = null;
    let currentUserId = null;
    let currentReply = null;
    let currentLastMessageId = null;
    let isLoadingMoreMessages = false;
    let mapConversationIdToConversation = new Map();

    let sendMessageMethod = 'send_message';

    // Xử lý socket
    let chatSocket = null;

   

    class ChatSocket {
        constructor(url) {
            this.url = url;
            this.socket = null;
            this.user_id = localStorage.getItem('user_id');
            this.username = localStorage.getItem('username');
            this.access = localStorage.getItem('access');
            if (this.access) {
                this.url += '?token=' + this.access;
            }
        }
        connect(){
            this.socket = new WebSocket(this.url);
            this.socket.onopen = () => {
                console.log('Connected to socket');
            }

            this.socket.onmessage = (event) =>{
                try{
                    const data = JSON.parse(event.data);
                    console.log('Received message:', data);
                    if (data.type === 'message') {
                        const data_detail = data.data;
                        if (data_detail.conversation) {
                            const conversationId = data_detail.conversation;
                            const isNewConversation = !mapConversationIdToConversation.has(conversationId);
                            
                            if (isNewConversation) {
                                // Conversation mới (từ DM), cần load lại danh sách conversations
                                showConversationsList().then(() => {
                                    // Tự động chuyển sang tab trò chuyện nếu đang ở chế độ DM
                                    if (sendMessageMethod === 'dm' && currentUserId) {
                                        sendMessageMethod = 'send_message';
                                        convosBtn.classList.add('active');
                                        friendsBtn.classList.remove('active');
                                        
                                        // Load conversation mới
                                        currentConversationId = conversationId;
                                        const senderName = data_detail.sender_username || currentChatTopic.textContent;
                                        currentChatTopic.textContent = senderName;
                                        showConversationMessages(conversationId);
                                    }
                                });
                            } else {
                                // Cập nhật conversation đã có
                                showConversationsList();
                            }
                        }
                        addMessageToUI(data_detail.sender_username, data_detail.content, parseInt(data_detail.sender) === parseInt(this.user_id));    
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            }
            this.socket.onclose = () => {
                console.log('Disconnected from socket');
            };
          
            this.socket.onerror = (e) => {
                console.error('WebSocket error:', e);
            };
   
        }

        disconnect(){
            if (this.socket) {
                this.socket.close();
                this.socket = null;
                console.log('Disconnected from socket');
            }
        }

        sendMessage(message){
            if (this.socket && this.socket.readyState === WebSocket.OPEN){
                this.socket.send(JSON.stringify(message));
            }
            else{
                console.error('Socket is not connected');
            }
        }
        
    }

    // helper function
    function showLoginUI() {
        chatApp.style.display = 'none';
        loginPage.style.display = 'block';
    }
    function showChatUI(username) {
        loginPage.style.display = 'none';
        chatApp.style.display = 'flex';
        if (username) userDisplay.textContent = username;
    }


    // --- Các hàm xử lý (Chờ điền code) ---

    /**
     * Xử lý khi người dùng nhấn nút Đăng nhập
     */
    async function handleLogin(username, password) {
        console.log('Attempting login:', { username, password });
        // TODO: Thêm logic xác thực backend tại đây
        // Ví dụ: gọi API fetch, kiểm tra token, v.v.

        // --- BẮT ĐẦU: Logic mô phỏng (Xóa khi có backend) ---
        // Chỉ cần mô phỏng đăng nhập thành công để hiển thị UI
        if (username && password) {
            loginPage.style.display = 'none'; // Ẩn form đăng nhập
            chatApp.style.display = 'flex'; // Hiển thị ứng dụng chat
            
            userDisplay.textContent = username; // Hiển thị tên người dùng
            
            const response = await fetch(LOGIN_URL, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.access) {
                localStorage.setItem('access', data.access);
                localStorage.setItem('refresh', data.refresh);
                console.log('Login success');

                const meResponse = await fetch(GET_ME, {
                    headers: {
                        'Authorization': 'Bearer ' + data.access
                    }
                });
                const meData = await meResponse.json();
                const userInfo = meData.data;
                localStorage.setItem('user_id', userInfo.id);
                localStorage.setItem('username', userInfo.username);
                chatSocket = new ChatSocket(WS_URL);
                chatSocket.connect();
                userDisplay.textContent = userInfo.username;
                showChatUI(userInfo.username);
                
                // Tự động load conversations và mở conversation đầu tiên
                await loadAndOpenFirstConversation();
            } else {
                console.error('Login failed:', data.message);
                showLoginUI();
            }
        }
    }

    /**
     * Xử lý khi người dùng nhấn nút Đăng ký
     */
    async function handleRegister(username, password) {
        console.log('Attempting register:', { username, password });
        if (username && password) {
        
            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.detail) {
                console.error('Register failed:', data.detail);
            } else {
                console.log('Register success');
            }
        }
    }

    /**
     * Xử lý khi người dùng nhấn nút Đăng xuất
     */
    function handleLogout() {
        if (chatSocket) {
            chatSocket.disconnect();
            chatSocket = null;
        }
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        showLoginUI();
    }

    /**
     * Xử lý khi người dùng gửi tin nhắn
     */
    async function handleSendMessage(messageText, options = {}) {
        if (chatSocket) {
            if(options.type === 'send_message'){
                chatSocket.sendMessage({
                    "action": "send_message",
                    "conversation_id": options.conversation_id,
                    "content": messageText,
                    "reply": options.reply
                });
            } 
            else if(options.type === 'dm'){
                chatSocket.sendMessage({
                    "action": "dm",
                    "to_user_id": options.to_user_id,
                    "content": messageText,
                    "reply": options.reply
                });
            }       
        } 
    }

    /**
     * Hiển thị danh sách bạn bè (Giả lập)
     */
    async function showFriendsList() {
        console.log('Showing friends list');
        friendsBtn.classList.add('active');
        convosBtn.classList.remove('active');
        const response = await fetch(GET_FRIENDS_URL, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access')
            }
        });
        const data = await response.json();
        const friends = data.data;
        listContainer.innerHTML = '';
        for (const friend of friends) {
            const friendElement = document.createElement('li');
            friendElement.innerHTML = `
                <div class="item-name">${friend.username}</div>
            `;
            // Thêm event listener khi click vào friend
            friendElement.addEventListener('click', async () => {
                await handleFriendClick(friend.id, friend.username);
            });
            listContainer.appendChild(friendElement);
        }
    }

    /**
     * Xử lý khi click vào một bạn bè
     */
    async function handleFriendClick(userId, username) {
        // Xóa tin nhắn cũ ngay từ đầu
        currentChatTopic.textContent = username;
        isLoadingMoreMessages = false;
        currentLastMessageId = null;
        try {
            // Kiểm tra xem đã có conversation_id chưa
            const response = await fetch(GET_CONVERSATION_ID_FROM_USER_ID(userId), {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access')
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const conversationId = data.data && data.data.conversation_id;
                
                if (conversationId) {
                    // Đã có conversation, chuyển sang tab trò chuyện và load conversation
                    sendMessageMethod = 'send_message';
                    currentConversationId = conversationId;
                    currentUserId = null; // Reset currentUserId khi có conversation
                    convosBtn.classList.add('active');
                    friendsBtn.classList.remove('active');
                    
                    // Load lại danh sách conversations để đảm bảo có conversation mới nhất
                    await showConversationsList();
                    
                    // Load tin nhắn của conversation
                    await showConversationMessages(conversationId);
                } else {
                    // Chưa có conversation, chuyển sang chế độ DM
                    sendMessageMethod = 'dm';
                    currentUserId = userId;
                    currentConversationId = null; // Reset currentConversationId khi chuyển sang DM
                }
            } else {
                // API trả về lỗi (có thể là chưa có conversation), chuyển sang chế độ DM
                sendMessageMethod = 'dm';
                currentUserId = userId;
                currentConversationId = null; // Reset currentConversationId khi chuyển sang DM
                messageList.innerHTML = '';
            }
        } catch (error) {
            console.error('Error checking conversation:', error);
            // Nếu có lỗi, vẫn cho phép gửi DM
            sendMessageMethod = 'dm';
            currentUserId = userId;
            currentConversationId = null; // Reset currentConversationId khi chuyển sang DM
            messageList.innerHTML = '';
        }
    }

    /**
     * Load và mở conversation đầu tiên (sau khi đăng nhập)
     */
    async function loadAndOpenFirstConversation() {
        try {
            // Load danh sách conversations
            mapConversationIdToConversation.clear();
            convosBtn.classList.add('active');
            friendsBtn.classList.remove('active');

            const response = await fetch(GET_CONVERSATIONS_URL, {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access')
                }
            });
            const data = await response.json();
            const conversations = data.data || [];
            
            // Lưu conversations vào map
            for (const conversation of conversations) {
                mapConversationIdToConversation.set(conversation.id, conversation);
            }
            
            // Hiển thị danh sách conversations
            showConversations();
            
            // Nếu có conversation, mở conversation đầu tiên (mới nhất)
            if (conversations.length > 0) {
                // Lấy tất cả conversations từ map và reverse để lấy conversation mới nhất
                const allConversations = Array.from(mapConversationIdToConversation.values());
                allConversations.reverse();
                const firstConversation = allConversations[0]; // Conversation mới nhất
                
                currentConversationId = firstConversation.id;
                currentChatTopic.textContent = firstConversation.to_user;
                sendMessageMethod = 'send_message';
                await showConversationMessages(firstConversation.id);
            } else {
                // Không có conversation, xóa tin nhắn và reset
                messageList.innerHTML = '';
                currentConversationId = null;
                currentChatTopic.textContent = '';
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            messageList.innerHTML = '';
            currentConversationId = null;
            currentChatTopic.textContent = '';
        }
    }

    /**
     * Hiển thị danh sách trò chuyện (Giả lập)
     */
    async function showConversationsList() {
        mapConversationIdToConversation.clear();
        console.log('Showing conversations list');
        convosBtn.classList.add('active');
        friendsBtn.classList.remove('active');

        const response = await fetch(GET_CONVERSATIONS_URL, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access')
            }
        });
        const data = await response.json();
        const conversations = data.data;
        for (const conversation of conversations) {
            mapConversationIdToConversation.set(conversation.id, conversation);
        }
        showConversations();
    }
    

    function showConversations(){
        listContainer.innerHTML = '';
        const allConversations = Array.from(mapConversationIdToConversation.values());

        // 2. Đảo ngược thứ tự mảng.
        // Nếu bạn đang dùng kỹ thuật "Xóa và Chèn lại" ở trên,
        // thì phần tử mới nhất đang ở cuối, việc đảo ngược sẽ đưa nó lên đầu.
        allConversations.reverse();
        for (const conversation of allConversations) {
            const conversationElement = document.createElement('li');
            conversationElement.innerHTML = `
                <div class="item-name" value="${conversation.id}">${conversation.to_user}</div>
                <div class="item-preview">${conversation.last_message}</div>
            `;
            conversationElement.addEventListener('click', async () => {
                currentConversationId = conversation.id;
                currentChatTopic.textContent = conversation.to_user;
                await showConversationMessages(conversation.id);
            });
            listContainer.appendChild(conversationElement);
        }
    }


    // Hiển thị tin nhắn của trò chuyện
    async function showConversationMessages(conversationId) {
        try {
            const response = await fetch(CONVERSATION_MESSAGE_URL(conversationId), {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access')
                }
            });
            const data = await response.json();
            const messages = data.data.data;
            currentLastMessageId = data.data.last_message_id;
            messageList.innerHTML = '';
            const userId = localStorage.getItem('user_id');
            for (const message of messages) {
                addMessageToUI(message.sender_username, message.content, parseInt(message.sender) === parseInt(userId));
            }
            messageList.scrollTop = messageList.scrollHeight;
        } catch (error) {
            console.error('Error loading messages:', error);
            alert('Không thể tải tin nhắn: ' + error.message);
        }
    }

    // Hiển thị thêm tin nhắn trước đó
    async function showMoreMessages(conversationId, last_message_id) {
        console.log('Showing more messages for conversation:', conversationId, 'with last message id:', last_message_id);
        if (isLoadingMoreMessages || !last_message_id) {
            return null;
        }
        
        isLoadingMoreMessages = true;
        try {
            // Thêm query parameter last_message_id vào URL
            const url = CONVERSATION_MESSAGE_URL(conversationId) + `?last_message_id=${last_message_id}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access')
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const messages = data.data.data;
            const newLastMessageId = data.data.last_message_id;
            
            if (messages && messages.length > 0) {
                // Lưu vị trí scroll hiện tại
                const oldScrollHeight = messageList.scrollHeight;
                const oldScrollTop = messageList.scrollTop;
                
                // Thêm tin nhắn vào đầu danh sách
                const userId = localStorage.getItem('user_id');
                const fragment = document.createDocumentFragment();
                
                // Thêm tin nhắn vào fragment theo thứ tự (từ cũ đến mới)
                for (const message of messages) {
                    const messageElement = createMessageElement(
                        message.sender_username, 
                        message.content, 
                        parseInt(message.sender) === parseInt(userId)
                    );
                    fragment.appendChild(messageElement);
                }
                
                // Chèn fragment vào đầu messageList
                if (messageList.firstChild) {
                    messageList.insertBefore(fragment, messageList.firstChild);
                } else {
                    messageList.appendChild(fragment);
                }
                
                // Khôi phục vị trí scroll (giữ nguyên vị trí người dùng đang xem)
                const newScrollHeight = messageList.scrollHeight;
                messageList.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
                
                currentLastMessageId = newLastMessageId;
            } else {
                // Không còn tin nhắn cũ hơn
                currentLastMessageId = null;
            }
            
            return newLastMessageId;
        } catch (error) {
            console.error('Error loading more messages:', error);
            return null;
        } finally {
            isLoadingMoreMessages = false;
        }
    }
    
    // Hàm tạo message element (tách ra để tái sử dụng)
    function createMessageElement(sender, text, isSelf = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (isSelf) {
            messageElement.classList.add('self');
        }

        const safeText = document.createTextNode(text).textContent;

        messageElement.innerHTML = `
            <div class="sender">${sender}</div>
            <div class="text">${safeText}</div>
        `;
        
        return messageElement;
    }   

    // --- Hàm hỗ trợ UI ---

    /**
     * Thêm một tin nhắn mới vào cửa sổ chat
     * @param {string} sender - Tên người gửi
     * @param {string} text - Nội dung tin nhắn
     * @param {boolean} isSelf - Tin nhắn này có phải của mình không
     */
    async function addMessageToUI(sender, text, isSelf = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        // Thêm class 'self' nếu là tin nhắn của mình
        if (isSelf) {
            messageElement.classList.add('self');
        }

        // Chuyển đổi text để tránh lỗi XSS (an toàn cơ bản)
        const safeText = document.createTextNode(text).textContent;

        messageElement.innerHTML = `
            <div class="sender">${sender}</div>
            <div class="text">${safeText}</div>
        `;
        
        messageList.appendChild(messageElement);
        
        // Tự động cuộn xuống tin nhắn mới nhất
        messageList.scrollTop = messageList.scrollHeight;
    }


    // --- Gán các trình nghe sự kiện ---

    // 1. Sự kiện form Đăng nhập
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Ngăn form tải lại trang
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await handleLogin(username, password);
    });

    // 2. Sự kiện nút Đăng ký
    registerButton.addEventListener('click', async (e) => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await handleRegister(username, password);
    });

    // 3. Sự kiện nút Đăng xuất MỚI
    logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleLogout();
    });

    // 4. Sự kiện form Gửi tin nhắn (Enter hoặc Click)
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Ngăn form tải lại trang
        const messageText = messageInput.value.trim(); // Lấy text và xóa khoảng trắng
        
        if (messageText) { // Chỉ gửi nếu có nội dung
            if (sendMessageMethod === 'send_message') {
                var options = {
                    type: sendMessageMethod,
                    conversation_id: currentConversationId,
                    reply: currentReply
                }
            }
            else if (sendMessageMethod === 'dm') {
                var options = {
                    type: sendMessageMethod,
                    to_user_id: currentUserId,
                    reply: currentReply
                }
            }
            console.log(options);
            await handleSendMessage(messageText, options);
            messageInput.value = ''; // Xóa nội dung đã nhập
            messageInput.focus(); // Tập trung lại vào ô input
        }
    });

    // 5. Sự kiện chuyển tab
    friendsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        sendMessageMethod = 'dm';
        await showFriendsList();
    });
    convosBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        sendMessageMethod = 'send_message';
        await showConversationsList();
    });
    
    // 6. Sự kiện scroll để load thêm tin nhắn cũ
    messageList.addEventListener('scroll', async (e) => {
        // Kiểm tra nếu đã scroll đến gần đầu (trong vòng 50px từ top)
        if (messageList.scrollTop < 50 && currentConversationId && currentLastMessageId && !isLoadingMoreMessages) {
            await showMoreMessages(currentConversationId, currentLastMessageId);
        }
    });

});