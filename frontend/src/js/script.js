document.addEventListener('DOMContentLoaded', async function() {
    // API 基础URL
    const API_BASE_URL = '/api';

    // 获取DOM元素
    const taskInput = document.getElementById('taskInput');
    const taskDateInput = document.getElementById('taskDate');
    const taskTimeInput = document.getElementById('taskTime');
    const addTaskBtn = document.getElementById('addTask');
    const pendingTasksList = document.getElementById('pendingTasks');
    const completedTasksList = document.getElementById('completedTasks');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // 设置默认日期和时间
    function setDefaultDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        taskDateInput.value = `${year}-${month}-${day}`;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        taskTimeInput.value = `${hours}:${minutes}`;
    }

    // 初始设置默认日期和时间
    setDefaultDateTime();

    // API 请求函数
    async function fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    // 时间处理工具函数
    const timeUtils = {
        // 获取当前UTC日期（YYYY-MM-DD格式）
        getCurrentUTCDay: () => {
            const now = new Date();
            return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().split('T')[0];
        },

        // 将本地日期转换为UTC日期字符串
        toUTCDay: (dateStr) => {
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    throw new Error('无效的日期格式');
                }
                return date.toISOString().split('T')[0];
            } catch (error) {
                console.error('日期转换错误:', error);
                throw error;
            }
        },

        // 将本地时间转换为UTC时间字符串
        toUTCTimeString: (timeStr) => {
            try {
                const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
                if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                    throw new Error('无效的时间格式');
                }
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
            } catch (error) {
                console.error('时间转换错误:', error);
                throw error;
            }
        },

        // 将UTC时间转换为本地显示时间
        formatLocalTime: (utcTimeStr) => {
            const today = new Date();
            const [hours, minutes, seconds] = utcTimeStr.split(':');
            const utcDate = new Date(Date.UTC(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
            ));
            
            return utcDate.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        },

        // 格式化日期为YYYY-MM-DD格式
        formatDisplayDate: (date) => {
            try {
                // 如果是字符串，尝试解析
                if (typeof date === 'string') {
                    date = new Date(date);
                }
                
                // 如果不是Date对象，创建一个
                if (!(date instanceof Date)) {
                    date = new Date(date);
                }

                // 验证日期是否有效
                if (isNaN(date.getTime())) {
                    console.error('无效的日期:', date);
                    return new Date().toISOString().split('T')[0]; // 返回今天的日期作为后备
                }

                // 返回 YYYY-MM-DD 格式
                return date.toISOString().split('T')[0];
            } catch (error) {
                console.error('日期格式化错误:', error);
                return new Date().toISOString().split('T')[0]; // 返回今天的日期作为后备
            }
        },

        // 创建UTC日期时间
        createUTCDateTime: (dateStr, timeStr) => {
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date');
                }
                const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
                if (isNaN(hours) || isNaN(minutes)) {
                    throw new Error('Invalid time');
                }
                const utcDate = new Date(Date.UTC(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    hours,
                    minutes,
                    0
                ));
                return {
                    day: utcDate,
                    time: utcDate.toISOString().split('T')[1].split('.')[0]
                };
            } catch (error) {
                console.error('创建UTC日期时间错误:', error);
                // 返回当前时间作为后备
                const now = new Date();
                const utcNow = new Date(Date.UTC(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    now.getHours(),
                    now.getMinutes(),
                    0
                ));
                return {
                    day: utcNow,
                    time: utcNow.toISOString().split('T')[1].split('.')[0]
                };
            }
        }
    };

    // 加载指定日期的任务
    async function loadTasks(date) {
        try {
            console.log('Loading tasks for date:', date);
            const utcDate = timeUtils.formatDisplayDate(date);
            console.log('UTC date:', utcDate);
            
            const tasks = await fetchAPI(`/tasks?date=${utcDate}`);
            console.log('Fetched tasks:', tasks);
            
            // 清空现有任务列表
            if (pendingTasksList) pendingTasksList.innerHTML = '';
            if (completedTasksList) completedTasksList.innerHTML = '';
            
            // 确保 tasks 是数组
            const validTasks = Array.isArray(tasks) ? tasks : [];
            
            // 分类并显示任务
            validTasks.forEach(task => {
                if (!task) return; // 跳过无效的任务
                
                try {
                    const taskElement = createTaskElement(
                        task.title,
                        task.task_day,
                        task.task_day_time,
                        task.completed,
                        task.id,
                        task.completed_at
                    );
                    
                    if (task.completed && completedTasksList) {
                        completedTasksList.appendChild(taskElement);
                    } else if (!task.completed && pendingTasksList) {
                        pendingTasksList.appendChild(taskElement);
                    }
                } catch (error) {
                    console.error('创建任务元素失败:', error, task);
                }
            });
        } catch (error) {
            console.error('加载任务失败:', error);
            // 清空任务列表
            if (pendingTasksList) pendingTasksList.innerHTML = '';
            if (completedTasksList) completedTasksList.innerHTML = '';
        }
    }

    // 创建任务元素
    function createTaskElement(taskText, taskDay, taskDayTime, isCompleted, taskId, completedAt) {
        const li = document.createElement('li');
        li.dataset.taskId = taskId;
        
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        const taskTitle = document.createElement('div');
        taskTitle.className = 'task-title';
        taskTitle.textContent = taskText;
        
        const taskTimeDiv = document.createElement('div');
        taskTimeDiv.className = 'task-time';
        
        if (isCompleted) {
            const completedTime = new Date(completedAt).toLocaleString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            taskTimeDiv.innerHTML = `<i class="far fa-check-circle"></i> 完成于 ${completedTime}`;
        } else {
            const displayTime = timeUtils.formatLocalTime(taskDayTime);
            taskTimeDiv.innerHTML = `<i class="far fa-clock"></i> 预计完成时间 ${displayTime}`;
        }
        
        taskContent.appendChild(taskTitle);
        taskContent.appendChild(taskTimeDiv);
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        if (!isCompleted) {
            const completeBtn = document.createElement('button');
            completeBtn.textContent = '完成';
            completeBtn.onclick = async () => {
                try {
                    await fetchAPI(`/tasks/${taskId}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            completed: true,
                            completed_at: new Date().toISOString()
                        })
                    });
                    await loadTasks(new Date());
                } catch (error) {
                    console.error('新任务态失败:', error);
                }
            };
            taskActions.appendChild(completeBtn);
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = async () => {
            try {
                await fetchAPI(`/tasks/${taskId}`, {
                    method: 'DELETE'
                });
                li.remove();
            } catch (error) {
                console.error('删除任务失败:', error);
            }
        };
        taskActions.appendChild(deleteBtn);
        
        li.appendChild(taskContent);
        li.appendChild(taskActions);
        
        return li;
    }

    // 添加任务
    async function addTask() {
        const title = taskInput.value.trim();
        const date = taskDateInput.value;
        const time = taskTimeInput.value;
        const isRecurring = document.getElementById('isRecurring').checked;
        const weekCount = isRecurring ? parseInt(document.getElementById('weekCount').value) || 4 : 0;

        if (!title || !date || !time) {
            alert('请填写完整信息');
            return;
        }

        try {
            console.log('添加任务:', {
                title,
                date,
                time,
                isRecurring,
                weekCount
            });

            // 验证日期格式
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                throw new Error('无效的日期格式');
            }

            // 验证时间格式
            const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                throw new Error('无效的时间格式');
            }

            const response = await fetchAPI('/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    task_day: timeUtils.toUTCDay(date),
                    task_day_time: timeUtils.toUTCTimeString(time),
                    is_recurring: isRecurring,
                    week_count: weekCount
                }),
            });

            console.log('任务创建成功:', response);

            // 清空输入
            taskInput.value = '';
            document.getElementById('isRecurring').checked = false;
            document.getElementById('weekCount').value = '4';
            document.getElementById('weekCountContainer').style.display = 'none';
            
            // 重新加载任务列表
            await loadTasks(new Date(date));
        } catch (error) {
            console.error('添加任务失败:', error);
            alert(error.message || '添加任务失败，请重试');
        }
    }

    // 绑定添加任务事件
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // 标签页切换
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tabId = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // 换标签页时加载相应的任务
            if (tabId === 'today') {
                await loadTasks(new Date());
            } else if (tabId === 'calendar') {
                await updateCalendar();
            }
        });
    });

    // 日历功能
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const currentMonthElement = document.getElementById('currentMonth');
    const calendarGrid = document.getElementById('calendar');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const selectedDateTaskList = document.getElementById('selectedDateTaskList');

    let currentDate = new Date();
    let selectedDate = new Date();
    let currentWeekStart = new Date();

    // 获取指定日期所在周的起始日期（周日为起始）
    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d;
    }

    // 更新日历标题
    function updateCalendarTitle() {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const startMonth = currentWeekStart.getMonth() + 1;
        const endMonth = weekEnd.getMonth() + 1;
        const startYear = currentWeekStart.getFullYear();
        const endYear = weekEnd.getFullYear();
        
        if (startYear === endYear) {
            if (startMonth === endMonth) {
                currentMonthElement.textContent = `${startYear}年${startMonth}月`;
            } else {
                currentMonthElement.textContent = `${startYear}年${startMonth}月-${endMonth}月`;
            }
        } else {
            currentMonthElement.textContent = `${startYear}年${startMonth}月-${endYear}年${endMonth}月`;
        }
    }

    // 更新选中日期的任务统计
    function updateTaskStats(tasks) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasksCount').textContent = completedTasks;
        document.getElementById('pendingTasksCount').textContent = pendingTasks;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    }

    // 创建日历中的任务指示器
    function createTaskIndicator(tasks) {
        const indicator = document.createElement('div');
        indicator.className = 'task-indicator';

        const completedTasks = tasks.filter(task => task.completed).length;
        const pendingTasks = tasks.length - completedTasks;

        if (pendingTasks > 0) {
            const pendingDot = document.createElement('div');
            pendingDot.className = 'dot pending';
            indicator.appendChild(pendingDot);
        }

        if (completedTasks > 0) {
            const completedDot = document.createElement('div');
            completedDot.className = 'dot completed';
            indicator.appendChild(completedDot);
        }

        return indicator;
    }

    // 更新日历
    async function updateCalendar() {
        calendarGrid.innerHTML = '';
        
        // 更新标题
        updateCalendarTitle();
        
        // 填充一周的日期
        for (let i = 0; i < 7; i++) {
            const currentDateObj = new Date(currentWeekStart);
            currentDateObj.setDate(currentWeekStart.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = currentDateObj.getDate();
            
            // 如果不是当前月份，添加其他月份的样式
            if (currentDateObj.getMonth() !== currentDate.getMonth()) {
                dayElement.classList.add('other-month');
            }
            
            const formattedDate = timeUtils.formatDisplayDate(currentDateObj);
            
            try {
                const tasks = await fetchAPI(`/tasks?date=${formattedDate}`);
                // 确保 tasks 是数组且不为空
                if (Array.isArray(tasks) && tasks.length > 0) {
                    dayElement.appendChild(createTaskIndicator(tasks));
                }

                if (isSameDate(currentDateObj, selectedDate)) {
                    // 确保传入有效的任务数组
                    updateTaskStats(Array.isArray(tasks) ? tasks : []);
                }
            } catch (error) {
                console.error('获取任务失败:', error);
                // 发生错误时传入空数组
                if (isSameDate(currentDateObj, selectedDate)) {
                    updateTaskStats([]);
                }
            }
            
            if (isToday(currentDateObj)) {
                dayElement.classList.add('today');
            }
            
            if (isSameDate(currentDateObj, selectedDate)) {
                dayElement.classList.add('selected');
            }
            
            dayElement.addEventListener('click', async () => {
                document.querySelectorAll('.calendar-day').forEach(day => {
                    day.classList.remove('selected');
                });
                dayElement.classList.add('selected');
                selectedDate = currentDateObj;
                updateSelectedDateTitle();
                
                try {
                    const tasks = await fetchAPI(`/tasks?date=${formattedDate}`);
                    // 确保 tasks 是数组
                    const validTasks = Array.isArray(tasks) ? tasks : [];
                    updateTaskStats(validTasks);
                    
                    const taskList = document.getElementById('selectedDateTaskList');
                    taskList.innerHTML = '';
                    validTasks.forEach(task => {
                        const taskElement = createTaskElement(
                            task.title,
                            task.task_day,
                            task.task_day_time,
                            task.completed,
                            task.id,
                            task.completed_at
                        );
                        taskList.appendChild(taskElement);
                    });
                } catch (error) {
                    console.error('加载任务失败:', error);
                    updateTaskStats([]); // 发生错误时显示空任务列表
                }
            });
            
            calendarGrid.appendChild(dayElement);
        }
    }

    // 更新选中日期标题
    function updateSelectedDateTitle() {
        selectedDateTitle.textContent = `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日的任务`;
    }

    // 判断是否是今天
    function isToday(date) {
        const today = new Date();
        return isSameDate(date, today);
    }

    // 判断是否是同一天
    function isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // 修改月份切换为周切换
    prevMonthBtn.textContent = '上一周';
    nextMonthBtn.textContent = '下一周';

    // 绑定周切换事件
    prevMonthBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        updateCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        updateCalendar();
    });

    // 初始化时设置当前周的开始日期
    currentWeekStart = getWeekStart(currentDate);

    // 初始化
    async function initialize() {
        try {
            // 确保默认显示今日任务标签页
            const todayTab = document.querySelector('[data-tab="today"]');
            const calendarTab = document.querySelector('[data-tab="calendar"]');
            const todayContent = document.getElementById('today-tab');
            const calendarContent = document.getElementById('calendar-tab');

            // 设置默认标签页为今日任务
            todayTab.classList.add('active');
            todayContent.classList.add('active');
            calendarTab.classList.remove('active');
            calendarContent.classList.remove('active');

            // 先加载今日任务
            console.log('Initializing and loading today\'s tasks...');
            await loadTasks(new Date());
            
            // 后台初始化日历
            console.log('Initializing calendar...');
            currentWeekStart = getWeekStart(currentDate);
            await updateCalendar();
            updateSelectedDateTitle();
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    // 立即调用初始化函数
    await initialize();

    // 周期性任务选项的事件监听
    document.getElementById('isRecurring').addEventListener('change', function() {
        const weekdaySelection = document.getElementById('weekdaySelection');
        if (this.checked) {
            weekdaySelection.style.display = 'block';
        } else {
            weekdaySelection.style.display = 'none';
        }
    });

    const isRecurringCheckbox = document.getElementById('isRecurring');
    const weekCountContainer = document.getElementById('weekCountContainer');

    isRecurringCheckbox.addEventListener('change', function() {
        if (isRecurringCheckbox.checked) {
            weekCountContainer.style.display = 'block';
        } else {
            weekCountContainer.style.display = 'none';
        }
    });

    // Tab 切换功能
    function initializeTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // 移除所有活动状态
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 设置当前 tab 为活动状态
                btn.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');

                // 如果切换到今日任务，重新加载任务
                if (tabId === 'today') {
                    loadTodayTasks();
                }
                // 如果切换到月度日历，刷新日历
                else if (tabId === 'calendar') {
                    updateCalendar();
                }
            });
        });

        // 默认显示今日任务
        document.querySelector('.tab-btn[data-tab="today"]').click();
    }

    // 初始化应用
    async function initializeApp() {
        initializeTabs();
        setupEventListeners();
        setupRecurringTaskHandlers();
        await loadTodayTasks();
        initializeCalendar();
    }

    // 设置事件监听器
    function setupEventListeners() {
        // 添加任务按钮事件
        const addTaskBtn = document.getElementById('addTask');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', handleAddTask);
        }

        // 周期性任务复选框事件
        const isRecurringCheckbox = document.getElementById('isRecurring');
        const weekCountContainer = document.getElementById('weekCountContainer');
        if (isRecurringCheckbox && weekCountContainer) {
            isRecurringCheckbox.addEventListener('change', (e) => {
                weekCountContainer.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // 日历导航按钮事件
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        if (prevMonthBtn && nextMonthBtn) {
            prevMonthBtn.addEventListener('click', () => navigateCalendar(-1));
            nextMonthBtn.addEventListener('click', () => navigateCalendar(1));
        }

        // 处理周期性任务选项
        setupRecurringTaskHandlers();
    }

    // 处理周期性任务选项
    function setupRecurringTaskHandlers() {
        const isRecurringCheckbox = document.getElementById('isRecurring');
        const dateSelection = document.getElementById('dateSelection');
        const weekdaySelection = document.getElementById('weekdaySelection');
        const weekCountContainer = document.getElementById('weekCountContainer');
        const taskDate = document.getElementById('taskDate');
        
        // 初始化时设置日期为今天
        const today = new Date();
        taskDate.value = formatDate(today);
        updateSelectedWeekday(taskDate.value);
        
        if (isRecurringCheckbox) {
            isRecurringCheckbox.addEventListener('change', (e) => {
                const isRecurring = e.target.checked;
                weekdaySelection.style.display = isRecurring ? 'block' : 'none';
                weekCountContainer.style.display = isRecurring ? 'block' : 'none';
            });
        }

        // 日期选择事件
        if (taskDate) {
            taskDate.addEventListener('change', (e) => {
                if (e.target.value) {
                    updateSelectedWeekday(e.target.value);
                }
            });
        }
    }

    // 更新选中的星期几
    function updateSelectedWeekday(dateString) {
        try {
            const selectedDate = new Date(dateString);
            if (isNaN(selectedDate.getTime())) {
                console.error('Invalid date:', dateString);
                return;
            }

            const dayOfWeek = selectedDate.getDay();
            const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            
            // 只显示选中日期对应的周几
            document.querySelectorAll('.weekday-buttons button').forEach(btn => {
                const btnDay = parseInt(btn.getAttribute('data-day'));
                if (btnDay === dayOfWeek) {
                    btn.classList.add('selected');
                    btn.innerHTML = `<strong>${weekdayNames[btnDay]}</strong>`;
                } else {
                    btn.classList.remove('selected');
                    btn.innerHTML = ''; // 清空其他按钮的内容
                }
            });
        } catch (error) {
            console.error('Error updating weekday:', error);
        }
    }

    // 获取选中的周几（用于提交表单时）
    function getSelectedWeekdays() {
        const taskDate = document.getElementById('taskDate');
        const isRecurring = document.getElementById('isRecurring').checked;
        
        if (isRecurring && taskDate.value) {
            try {
                const selectedDate = new Date(taskDate.value);
                if (!isNaN(selectedDate.getTime())) {
                    return [selectedDate.getDay().toString()];
                }
            } catch (error) {
                console.error('Error getting selected weekday:', error);
            }
        }
        return [];
    }

    // 修改添加任务的处理函数
    async function handleAddTask() {
        const taskInput = document.getElementById('taskInput');
        const taskDate = document.getElementById('taskDate');
        const taskTime = document.getElementById('taskTime');
        const isRecurring = document.getElementById('isRecurring').checked;
        const weekCount = document.getElementById('weekCount');

        if (!taskInput.value || !taskDate.value || !taskTime.value) {
            alert('请填写完整信息');
            return;
        }

        let dates = [];
        if (isRecurring) {
            const selectedWeekday = new Date(taskDate.value).getDay();
            const weeks = parseInt(weekCount.value);
            const startDate = new Date(taskDate.value);
            
            // 生成未来 n 周的日期
            for (let w = 0; w < weeks; w++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + (7 * w));
                dates.push(formatDate(date));
            }
        } else {
            dates = [taskDate.value];
        }

        // 为每个日期创建任务
        for (let date of dates) {
            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: taskInput.value,
                        date: date,
                        time: taskTime.value,
                        isRecurring: isRecurring,
                        weekCount: isRecurring ? parseInt(weekCount.value) : null
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to add task');
                }
            } catch (error) {
                console.error('Error adding task:', error);
                alert('添加任务失败');
                return;
            }
        }

        // 清空输入
        taskInput.value = '';
        taskTime.value = '';
        if (isRecurring) {
            document.getElementById('isRecurring').checked = false;
            document.getElementById('weekdaySelection').style.display = 'none';
            document.getElementById('weekCountContainer').style.display = 'none';
        }

        // 重置日期为今天
        const today = new Date();
        taskDate.value = formatDate(today);
        updateSelectedWeekday(taskDate.value);

        // 刷新任务列表
        await loadTodayTasks();
        updateCalendar();
    }

    // 格式化日期函数
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    document.getElementById('taskDate').addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const dayOfWeek = selectedDate.getDay();
        
        // 清除之前的高亮
        document.querySelectorAll('.weekday-buttons button').forEach(button => {
            button.classList.remove('active');
        });

        // 高亮当前选择的星期几
        const buttonToHighlight = document.querySelector(`.weekday-buttons button[data-day="${dayOfWeek}"]`);
        if (buttonToHighlight) {
            buttonToHighlight.classList.add('active');
        }
    });
}); 