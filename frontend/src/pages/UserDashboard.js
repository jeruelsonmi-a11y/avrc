import React, { useState, useEffect, useRef } from 'react';
import '../styles/UserDashboard.css';
import { API_BASE_URL, WS_BASE_URL } from '../config';

function UserDashboard({ onLogout }) {
  // Function to map equipment names to their categories
  const getEquipCategory = (equipmentName) => {
    if (!equipmentName) return '';
    const nameUpper = String(equipmentName).toUpperCase();
    
    const categoryMap = {
      'SPEAKER': 'SPEAKER',
      'MICROPHONE': 'MICROPHONE',
      'MIC': 'MICROPHONE',
      'EXTENSION CORD': 'EXTENSION',
      'HDMI CABLE': 'HDMI',
      'HDMI': 'HDMI',
      'FLAG': 'FLAG',
      'TV': 'TV',
      'PROJECTOR': 'PROJECTOR'
    };
    
    return categoryMap[nameUpper] || nameUpper;
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [userName, setUserName] = useState('User');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAccountSuccess, setShowAccountSuccess] = useState(false);
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationData, setReservationData] = useState({
    dateNeeded: '',
    timeNeeded: '',
    purpose: ''
  });
  const [selectedEquipmentsList, setSelectedEquipmentsList] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [roomList, setRoomList] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [showRoomReservationForm, setShowRoomReservationForm] = useState(false);
  const [roomReservationData, setRoomReservationData] = useState({
    dateNeeded: '',
    timeFrom: '',
    timeTo: '',
    purpose: ''
  });
  const [selectedRoomsList, setSelectedRoomsList] = useState([]);
  const [showRoomReservationSuccess, setShowRoomReservationSuccess] = useState(false);
  const [showReservationSuccess, setShowReservationSuccess] = useState(false);
  const [equipmentReservations, setEquipmentReservations] = useState([]);
  const [roomReservations, setRoomReservations] = useState([]);
  const [reservationFilterTab, setReservationFilterTab] = useState('equipment');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteNotifConfirm, setShowDeleteNotifConfirm] = useState(false);
  const [showDeleteAllNotifConfirm, setShowDeleteAllNotifConfirm] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [activeReservation, setActiveReservation] = useState(null);
  const [equipmentReservationError, setEquipmentReservationError] = useState('');
  const [roomReservationError, setRoomReservationError] = useState('');
  const [editModalError, setEditModalError] = useState('');
  const [reservedSlots, setReservedSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedRoomView, setSelectedRoomView] = useState(101);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'Hi! I\'m your AVRC Assistant. I can help you reserve equipment or rooms. What would you like to do?\n\n📋 To reserve via chat, just tell me:\n• What equipment or room you need\n• When you need it (date)\n• What time\n• Purpose of use\n\nExample: "I need a speaker on March 18 at 2pm for a presentation"', sender: 'bot', timestamp: new Date(), suggestions: ['Reserve Equipment', 'Reserve Room', 'View Reservations'] }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatContext, setChatContext] = useState({
    lastReserved: null,
    preferredEquipment: null,
    preferredRoom: null,
    searchedItem: null
  });
  
  // Store partial reservation information for follow-up questions
  const [reservationContext, setReservationContext] = useState({
    equipment: null,
    room: null,
    date: null,
    time: null,
    purpose: null,
    isActive: false // Whether we're in the middle of collecting reservation info
  });
  const [editReservationData, setEditReservationData] = useState({
    dateNeeded: '',
    timeNeeded: '',
    timeFrom: '',
    timeTo: '',
    purpose: ''
  });
  const [accountInfo, setAccountInfo] = useState({
    fullname: '',
    email: '',
    id_number: '',
    department: '',
    sub: ''
  });
  const [editedInfo, setEditedInfo] = useState({
    fullname: '',
    email: '',
    id_number: '',
    department: '',
    sub: ''
  });
  const [notifications, setNotifications] = useState([]);

  // Ref for auto-scrolling chat messages to bottom
  const chatMessagesEndRef = useRef(null);

  // Helper functions for equipment status
  const normalizeStatusLabel = (status) => {
    if (!status && status !== 0) return '';
    const text = String(status).trim();
    if (!text) return '';
    return text
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const getEquipmentStatusLabel = (equipment) => {
    if (equipment && equipment.status) {
      return normalizeStatusLabel(equipment.status);
    }
    return equipment && equipment.available ? 'Available' : 'Not Available';
  };

  const getEquipmentStatusClass = (label) => {
    const key = normalizeStatusLabel(label || '')
      .toLowerCase()
      .replace(/ /g, '-');
    // Ensure we return a known class option to match CSS.
    const allowed = ['available', 'not-available', 'under-maintenance', 'for-repair'];
    return allowed.includes(key) ? key : 'not-available';
  };

  const isEquipmentAvailable = (equipment) => {
    const label = getEquipmentStatusLabel(equipment);
    return label.toLowerCase() === 'available';
  };

  useEffect(() => {
    const storedName = localStorage.getItem('user_fullname') || 'User';
    setUserName(storedName);
    
    // Fetch user account information from backend
    const userId = localStorage.getItem('user_id');
    if (userId) {
      fetch(`${API_BASE_URL}/auth/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setAccountInfo({
            fullname: data.fullname,
            email: data.email,
            id_number: data.id_number,
            department: data.department || '',
            sub: data.sub || ''
          });
          setEditedInfo({
            fullname: data.fullname,
            email: data.email,
            id_number: data.id_number,
            department: data.department || '',
            sub: data.sub || ''
          });
        }
      })
      .catch(err => console.error('Failed to fetch user info:', err));
    }
  }, []);

  // Update editedInfo when accountInfo changes
  useEffect(() => {
    setEditedInfo(accountInfo);
  }, [accountInfo]);

  // Fetch equipment from backend
  // helper to load reservations and mark equipment availability
  const refreshReservations = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const res = await fetch(`${API_BASE_URL}/reservations/?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalizeStatus = (s) => {
          const v = (s ?? '').toString().trim().toLowerCase();
          if (!v) return s;
          if (v === 'pending') return 'Pending';
          if (v === 'approved' || v === 'confirmed') return 'Approved';
          if (v === 'denied' || v === 'rejected') return 'Denied';
          if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
          if (v === 'returned') return 'Returned';
          return v.charAt(0).toUpperCase() + v.slice(1);
        };
        // normalize to camelCase and compute itemName
        const normalize = (r) => {
          const out = {
            ...r,
            itemType: r.item_type,
            item_id: r.item_id,
            dateNeeded: r.date_needed,
            timeFrom: r.time_from,
            timeTo: r.time_to,
            timeNeeded: r.time_from || r.time_to || r.time_needed,
            status: normalizeStatus(r.status)
          };
          if (r.item_type === 'equipment') {
            const eq = equipmentList.find(e => e.id === r.item_id);
            out.itemName = eq ? `${eq.name} (#${eq.item_number})` : '';
            out.equipmentId = r.item_id;
          } else if (r.item_type === 'room') {
            const rm = roomList.find(rm => rm.id === r.item_id);
            out.itemName = rm ? rm.name : '';
            out.equipmentId = r.item_id;
          }
          return out;
        };
        const eq = data.filter(r => r.item_type === 'equipment').map(normalize);
        const rm = data.filter(r => r.item_type === 'room').map(normalize);
        setEquipmentReservations(eq);
        setRoomReservations(rm);
      }
      
      // Also refresh equipment list from backend to get real availability status
      const equipRes = await fetch(`${API_BASE_URL}/equipment/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (equipRes.ok) {
        const equipData = await equipRes.json();
        setEquipmentList(equipData);
      }
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const access_token = localStorage.getItem('access_token');
      if (!access_token) {
        console.warn('[Notifications] No access token found, skipping fetch');
        setNotifications([]);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/notifications/`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else if (res.status === 401) {
        console.warn('[Notifications] Unauthorized - token may be expired');
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    }
  };

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/equipment/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setEquipmentList(data);
        }
      } catch (err) {
        console.error('Failed to fetch equipment:', err);
      }
    };
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/rooms/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setRoomList(data);
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
      }
    };

    // perform all loads sequentially to ensure reservations can use latest lists
    (async () => {
      const token = localStorage.getItem('access_token');
      console.log('[DEBUG] Access token on mount:', token ? 'Present' : 'Missing');
      await fetchEquipment();
      await fetchRooms();
      await refreshReservations();
      await fetchNotifications();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime updates (WebSocket): refresh reservations/notifications when events happen
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let ws = null;
    let pingTimer = null;
    let reconnectTimeout = null;
    let isManuallyClosing = false;

    const normalizeStatus = (s) => {
      const v = (s ?? '').toString().trim().toLowerCase();
      if (!v) return s;
      if (v === 'pending') return 'Pending';
      if (v === 'approved' || v === 'confirmed') return 'Approved';
      if (v === 'denied' || v === 'rejected') return 'Denied';
      if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
      if (v === 'returned') return 'Returned';
      return v.charAt(0).toUpperCase() + v.slice(1);
    };

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);

        ws.onopen = () => {
          console.log('[WebSocket] Connected');
          // Keep-alive: prevents idle timeouts; backend is waiting on receive_text()
          pingTimer = window.setInterval(() => {
            try {
              if (ws && ws.readyState === WebSocket.OPEN) ws.send('ping');
            } catch (e) {
              // ignore
            }
          }, 25000);
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const t = msg && msg.type;
            if (!t || t === 'connected') return;

            // Apply reservation status updates immediately (then sync by refetch)
            if (t === 'reservation.updated' && msg && msg.reservation_id) {
              const newStatus = normalizeStatus(msg.status);
              if (msg.item_type === 'equipment') {
                setEquipmentReservations(prev => prev.map(r => (r.id === msg.reservation_id ? { ...r, status: newStatus } : r)));
              } else if (msg.item_type === 'room') {
                setRoomReservations(prev => prev.map(r => (r.id === msg.reservation_id ? { ...r, status: newStatus } : r)));
              }
            }

            if (t.startsWith('reservation.') || t.startsWith('notification.') || t.startsWith('equipment_return.')) {
              refreshReservations();
              fetchNotifications();
            }

            // Refresh room list when any room event occurs
            if (t.startsWith('room.')) {
              // Fetch updated room list
              fetch(`${API_BASE_URL}/rooms/`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
              })
              .then(res => res.ok && res.json())
              .then(data => data && setRoomList(data))
              .catch(err => console.error('Failed to fetch rooms:', err));
            }

            // Refresh equipment list when any equipment event occurs
            if (t.startsWith('equipment.')) {
              // Fetch updated equipment list
              fetch(`${API_BASE_URL}/equipment/`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
              })
              .then(res => res.ok && res.json())
              .then(data => data && setEquipmentList(data))
              .catch(err => console.error('Failed to fetch equipment:', err));
            }
          } catch (e) {
            // ignore malformed messages
          }
        };

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
        };

        ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          if (pingTimer) window.clearInterval(pingTimer);
          
          // Auto-reconnect after 5 seconds unless manually closing
          if (!isManuallyClosing) {
            reconnectTimeout = window.setTimeout(() => {
              console.log('[WebSocket] Attempting to reconnect...');
              connectWebSocket();
            }, 5000);
          }
        };
      } catch (e) {
        console.error('[WebSocket] Connection error:', e);
      }
    };

    // Initial connection
    connectWebSocket();

    return () => {
      isManuallyClosing = true;
      try {
        if (pingTimer) window.clearInterval(pingTimer);
      } catch (e) {
        // ignore
      }
      try {
        if (reconnectTimeout) window.clearTimeout(reconnectTimeout);
      } catch (e) {
        // ignore
      }
      try {
        if (ws) ws.close();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time polling: Periodically refresh reservations and notifications
  // This ensures updates even if WebSocket disconnects
  useEffect(() => {
    // Poll every 1 second for new reservations and notifications
    const pollInterval = window.setInterval(async () => {
      try {
        await refreshReservations();
        await fetchNotifications();
        // Also fetch rooms and equipment to check for availability changes
        const roomRes = await fetch(`${API_BASE_URL}/rooms/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (roomRes.ok) {
          const data = await roomRes.json();
          setRoomList(data);
        }
        const equipRes = await fetch(`${API_BASE_URL}/equipment/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (equipRes.ok) {
          const data = await equipRes.json();
          setEquipmentList(data);
        }
      } catch (err) {
        console.error('Error during polling update:', err);
      }
    }, 1000); // 1 second

    return () => {
      if (pollInterval) window.clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure we auto-select the first room when the room list changes
  useEffect(() => {
    if (!roomList || roomList.length === 0) return;
    const exists = roomList.some(r => r.id === selectedRoomView);
    if (!exists) {
      setSelectedRoomView(roomList[0].id);
    }
  }, [roomList, selectedRoomView]);

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
        if (showChatbot) {
          setShowChatbot(false);
        }
        if (showNotificationsMenu) {
          setShowNotificationsMenu(false);
        }
      }
    };

    const handleClickOutside = (e) => {
      const profileMenu = document.querySelector('.userdash-profile-menu');
      if (profileMenu && !profileMenu.contains(e.target)) {
        setShowProfileMenu(false);
      }
      
      const chatbotWindow = document.querySelector('.chatbot-window');
      const chatbotButton = document.querySelector('.chatbot-toggle-btn');
      if (chatbotWindow && !chatbotWindow.contains(e.target) && !chatbotButton.contains(e.target)) {
        setShowChatbot(false);
      }

      const notificationsMenu = document.querySelector('.userdash-notifications-menu');
      const notificationsBtn = document.querySelector('.userdash-notifications-btn');
      if (notificationsMenu && !notificationsMenu.contains(e.target) && !notificationsBtn.contains(e.target)) {
        setShowNotificationsMenu(false);
      }
    };

    if (showProfileMenu || showChatbot || showNotificationsMenu) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProfileMenu, showChatbot, showNotificationsMenu]);

  // Auto-scroll chat messages to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      setTimeout(() => {
        chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatMessages]);

  // Smooth scroll to top when switching tabs (without jerky movement)
  useEffect(() => {
    // Use smooth scrolling for gradual transition
    const scrollToTop = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 0) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    };
    
    scrollToTop();
  }, [activeTab]);

  // Helper function to convert 24-hour time to 12-hour format with AM/PM
  const formatTimeWithAMPM = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to format date as "Month DD, YYYY"
  const formatDateWithMonthName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Helper function to get today's date in YYYY-MM-DD format for date input min attribute
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to check if reservation is within office hours
  const isWithinOfficeHours = (dateString, timeString, allowEndInclusive = false) => {
    // Accept date strings in ISO (`yyyy-mm-dd`) or `dd/mm/yyyy` formats.
    let date;
    if (!dateString) return false;
    if (dateString.includes('/')) {
      // assume dd/mm/yyyy
      const parts = dateString.split('/').map(p => parseInt(p, 10));
      if (parts.length === 3) {
        const [d, m, y] = parts;
        date = new Date(y, (m || 1) - 1, d || 1);
      } else {
        date = new Date(dateString);
      }
    } else {
      // try Date constructor (handles yyyy-mm-dd and ISO)
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return false;
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    // Office is closed on Sunday
    if (dayOfWeek === 0) {
      return false;
    }

    // Parse the time
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // Monday to Friday: 7:30 AM to 5:00 PM
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const openTime = 7 * 60 + 30; // 7:30 AM
      const closeTime = 17 * 60; // 5:00 PM
      return allowEndInclusive ? (totalMinutes >= openTime && totalMinutes <= closeTime) : (totalMinutes >= openTime && totalMinutes < closeTime);
    }

    // Saturday: 8:00 AM to 12:00 PM
    if (dayOfWeek === 6) {
      const openTime = 8 * 60; // 8:00 AM
      const closeTime = 12 * 60; // 12:00 PM
      return allowEndInclusive ? (totalMinutes >= openTime && totalMinutes <= closeTime) : (totalMinutes >= openTime && totalMinutes < closeTime);
    }

    return false;
  };

  const formatReservationTime = (reservation) => {
    if (!reservation) return '';
    // For equipment reservations show a single time (timeNeeded/timeFrom/timeTo)
    if (reservation.itemType === 'equipment' || reservation.itemType === 'Equipment') {
      const t = reservation.timeNeeded || reservation.timeFrom || reservation.timeTo || reservation.time_needed || reservation.time_from || reservation.time_to;
      return t ? formatTimeWithAMPM(t) : '';
    }

    // For rooms show a range when both are present, otherwise fallback to a single time
    if (reservation.timeFrom && reservation.timeTo) {
      return `${formatTimeWithAMPM(reservation.timeFrom)} to ${formatTimeWithAMPM(reservation.timeTo)}`;
    }
    if (reservation.timeNeeded) return formatTimeWithAMPM(reservation.timeNeeded);
    return '';
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
    setShowProfileMenu(false);
  };

  const confirmLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_fullname');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    setShowLogoutModal(false);
    if (onLogout) onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const deleteNotification = async (notifId) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setShowDeleteNotifConfirm(false);
      setNotifToDelete(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      for (const notif of notifications) {
        await fetch(`${API_BASE_URL}/notifications/${notif.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
      }
      setNotifications([]);
      setShowDeleteAllNotifConfirm(false);
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      alert('Failed to delete all notifications');
    }
  };

  const handleViewAccount = () => {
    setShowAccountModal(true);
    setShowProfileMenu(false);
  };

  const handleAccountChange = (field, value) => {
    if (field === 'email') {
      // Only allow editing the part before @, always append @shc.edu.ph
      setEditedInfo({
        ...editedInfo,
        [field]: value + '@shc.edu.ph'
      });
    } else {
      setEditedInfo({
        ...editedInfo,
        [field]: value
      });
    }
  };

  const handleSaveAccount = () => {
    const userId = localStorage.getItem('user_id');
    fetch(`${API_BASE_URL}/auth/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify(editedInfo)
    })
    .then(res => res.json())
    .then(data => {
      if (data.id) {
        setAccountInfo(editedInfo);
        setUserName(editedInfo.fullname);
        localStorage.setItem('user_fullname', editedInfo.fullname);
        setShowAccountSuccess(true);
        setTimeout(() => {
          setShowAccountSuccess(false);
          setShowAccountModal(false);
        }, 2000);
      }
    })
    .catch(err => {
      alert('Failed to save account information');
    });
  };

  const handleCancelAccount = () => {
    setEditedInfo(accountInfo);
    setShowAccountModal(false);
  };

  const handleProceedToReservation = () => {
    setEquipmentReservationError('');
    setSelectedEquipmentsList(selectedEquipments);
    setShowReservationForm(true);
  };

  const handleProceedToRoomReservation = () => {
    setRoomReservationError('');
    setSelectedRoomsList(selectedRooms);
    setShowRoomReservationForm(true);
  };

  const handleReservationChange = (field, value) => {
    setReservationData({
      ...reservationData,
      [field]: value
    });
  };

  const handleSubmitReservation = async () => {
    if (isSubmittingReservation) return; // Prevent double submit
    setEquipmentReservationError('');
    setIsSubmittingReservation(true);
    try {
      if (!reservationData.dateNeeded || !reservationData.timeNeeded || !reservationData.purpose) {
        setEquipmentReservationError('Please fill in all fields');
        setIsSubmittingReservation(false);
        return;
      }

      // Check if reservation is within office hours
      if (!isWithinOfficeHours(reservationData.dateNeeded, reservationData.timeNeeded)) {
        const date = new Date(reservationData.dateNeeded);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) {
          setEquipmentReservationError('Sorry, we are closed on Sundays. Please choose a different date.');
        } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          setEquipmentReservationError('Equipment reservation must be between 7:30 AM and 5:00 PM on weekdays (Monday-Friday).');
        } else if (dayOfWeek === 6) {
          setEquipmentReservationError('Equipment reservation must be between 8:00 AM and 12:00 PM on Saturdays.');
        }
        setIsSubmittingReservation(false);
        return;
      }

      // Check if reservation is during lunch time (12:00 PM - 12:59 PM)
      const [hours] = reservationData.timeNeeded.split(':').map(Number);
      if (hours === 12) {
        setEquipmentReservationError('Equipment cannot be reserved during lunch time (12:00 PM - 1:00 PM). Please choose a different time.');
        setIsSubmittingReservation(false);
        return;
      }

      // Persist each equipment reservation to backend
      const payloads = selectedEquipmentsList.map(equipmentId => {
        return {
          item_type: 'equipment',
          item_id: equipmentId,
          date_needed: reservationData.dateNeeded,
          time_from: reservationData.timeNeeded,
          time_to: reservationData.timeNeeded,
          purpose: reservationData.purpose
        };
      });

      const created = [];
      for (let p of payloads) {
        const res = await fetch(`${API_BASE_URL}/reservations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(p)
        });
        if (res.ok) {
          const data = await res.json();
          created.push(data);
        } else {
          const err = await res.json().catch(() => ({}));
          console.error('Failed to create reservation', err);
        }
      }
      if (created.length > 0) {
        setEquipmentReservations([...equipmentReservations, ...created]);
        await refreshReservations();
      }

      console.log('Reservation submitted:', {
        equipments: selectedEquipmentsList,
        ...reservationData
      });

      setShowReservationSuccess(true);
      setTimeout(() => {
        setShowReservationSuccess(false);
        setShowReservationForm(false);
        setReservationData({ dateNeeded: '', timeNeeded: '', purpose: '' });
        setSelectedEquipments([]);
        setActiveTab('my-reservation');
        setReservationFilterTab('equipment');
      }, 2500);
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  const handleCancelReservation = () => {
    setShowReservationForm(false);
    setReservationData({ dateNeeded: '', timeNeeded: '', purpose: '' });
    setEquipmentReservationError('');
  };

  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDay() === 0; // Sunday = 0
  };

  const handleRoomReservationChange = (field, value) => {
    setRoomReservationData({
      ...roomReservationData,
      [field]: value
    });

    // Fetch reserved slots when room or date changes
    if (field === 'dateNeeded' || field === 'dateNeeded') {
      if (selectedRoomsList.length > 0 && value) {
        // Don't fetch if it's Sunday - office is closed
        if (!isSunday(value)) {
          fetchRoomAvailability(selectedRoomsList[0], value);
        } else {
          setReservedSlots([]);
        }
      }
    }
  };

  const fetchRoomAvailability = async (roomId, dateNeeded) => {
    if (!roomId || !dateNeeded) return;
    
    setLoadingAvailability(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/reservations/availability/${roomId}/${dateNeeded}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setReservedSlots(data.reserved_slots || []);
      }
    } catch (err) {
      console.error('Error fetching room availability:', err);
    }
    setLoadingAvailability(false);
  };

  const handleSubmitRoomReservation = async () => {
    setRoomReservationError('');

    const { dateNeeded, timeFrom, timeTo, purpose } = roomReservationData;
    if (!dateNeeded || !timeFrom || !timeTo || !purpose) {
      setRoomReservationError('Please fill in all fields');
      return;
    }

    // Ensure start < end
    if (timeFrom >= timeTo) {
      setRoomReservationError('End time must be after start time');
      return;
    }

    // Check both times are within office hours (end time may be equal to closing time)
    if (!isWithinOfficeHours(dateNeeded, timeFrom, false) || !isWithinOfficeHours(dateNeeded, timeTo, true)) {
      const date = new Date(dateNeeded);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0) {
        setRoomReservationError('Sorry, we are closed on Sundays. Please choose a different date.');
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        setRoomReservationError('Room reservation must be between 7:30 AM and 5:00 PM on weekdays (Monday-Friday).');
      } else if (dayOfWeek === 6) {
        setRoomReservationError('Room reservation must be between 8:00 AM and 12:00 PM on Saturdays.');
      }
      return;
    }

    // Do not change room availability on reservation — multiple users can reserve the same room

    // Overlap detection helper
    const toMinutes = (t) => {
      if (!t) return null;
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };

    const overlaps = (s1, e1, s2, e2) => {
      return s1 < e2 && s2 < e1;
    };

    // Block lunch time (12:00 PM - 1:00 PM)
    const reqStart = toMinutes(timeFrom);
    const reqEnd = toMinutes(timeTo);
    const LUNCH_START = 12 * 60; // 12:00 PM
    const LUNCH_END = 13 * 60; // 1:00 PM
    if (reqStart == null || reqEnd == null) {
      setRoomReservationError('Invalid time format.');
      return;
    }
    if (reqStart < LUNCH_END && LUNCH_START < reqEnd) {
      setRoomReservationError('Selected time overlaps lunch break (12:00 PM - 1:00 PM). Please choose another time.');
      return;
    }

    // Validate for each selected room whether the requested time overlaps existing room reservations
    for (let roomId of selectedRoomsList) {
      const existing = roomReservations.filter(r => r.equipmentId === roomId && r.dateNeeded === dateNeeded);
      if (existing.length === 0) continue;

      const reqStart = toMinutes(timeFrom);
      const reqEnd = toMinutes(timeTo);
      const duration = reqEnd - reqStart;

      // find any overlap
      const conflicting = existing.filter(r => {
        const exStart = toMinutes(r.timeFrom || r.timeNeeded);
        const exEnd = toMinutes(r.timeTo || r.timeNeeded);
        if (exStart == null || exEnd == null) return false;
        return overlaps(reqStart, reqEnd, exStart, exEnd);
      });

      if (conflicting.length > 0) {
        // compute suggestion: next available start after the latest end among existing reservations
        const latestEnd = Math.max(...existing.map(r => toMinutes(r.timeTo || r.timeNeeded)));
        const suggestedStart = latestEnd;
        const suggestedEnd = suggestedStart + duration;
        const fmt = (m) => {
          const hh = Math.floor(m / 60).toString().padStart(2, '0');
          const mm = (m % 60).toString().padStart(2, '0');
          return formatTimeWithAMPM(`${hh}:${mm}`);
        };
        const room = roomList.find(r => r.id === roomId);
        const suggestionMsg = `Selected time overlaps with existing reservation for ${room ? room.name : 'this room'}. Suggested available: ${fmt(suggestedStart)} to ${fmt(suggestedEnd)}.`;
        setRoomReservationError(suggestionMsg);
        return;
      }
    }

    // Persist to backend
    try {
      const created = [];
      let hasError = false;
      for (let roomId of selectedRoomsList) {
        const payload = {
          item_type: 'room',
          item_id: roomId,
          date_needed: dateNeeded,
          time_from: timeFrom,
          time_to: timeTo,
          purpose: purpose
        };
        const res = await fetch(`${API_BASE_URL}/reservations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          created.push(data);
        } else {
          hasError = true;
          const err = await res.json().catch(() => ({}));
          const errorMsg = err.detail || 'Failed to create room reservation. Please try again.';
          setRoomReservationError(errorMsg);
          console.error('Failed to create room reservation', err);
          break; // Stop on first error
        }
      }
      if (hasError) {
        return; // Don't proceed if there's an error
      }
      if (created.length > 0) {
        setRoomReservations([...roomReservations, ...created]);
        await refreshReservations();
      }
    } catch (err) {
      setRoomReservationError('Error creating room reservations: ' + (err.message || 'Unknown error'));
      console.error('Error creating room reservations:', err);
    }

    console.log('Room reservation submitted:', {
      rooms: selectedRoomsList,
      ...roomReservationData
    });
    
    setShowRoomReservationSuccess(true);
    setTimeout(() => {
      setShowRoomReservationSuccess(false);
      setShowRoomReservationForm(false);
      setRoomReservationData({ dateNeeded: '', timeFrom: '', timeTo: '', purpose: '' });
      setSelectedRooms([]);
      setActiveTab('my-reservation');
      setReservationFilterTab('room');
    }, 2500);
  };

  const handleCancelRoomReservation = () => {
    setShowRoomReservationForm(false);
    setRoomReservationData({ dateNeeded: '', timeFrom: '', timeTo: '', purpose: '' });
    setRoomReservationError('');
  };

  const handleViewReservation = (reservation) => {
    // compute itemName if missing
    const res = { ...reservation };
    if (!res.itemName) {
      if (res.item_type === 'equipment') {
        const eq = equipmentList.find(e => e.id === res.item_id);
        res.itemName = eq ? `${eq.name} (#${eq.item_number})` : '';
        res.equipmentId = res.item_id;
      } else if (res.item_type === 'room') {
        const rm = roomList.find(r => r.id === res.item_id);
        res.itemName = rm ? rm.name : '';
        res.equipmentId = res.item_id;
      }
    }
    setActiveReservation(res);
    setShowViewModal(true);
  };

  const handleEditReservation = (reservation) => {
    // Check if reservation is already approved - prevent editing
    const status = (reservation.status || 'pending').toString().toLowerCase();
    if (status === 'approved' || status === 'confirmed') {
      alert('Approved reservations cannot be edited. Please contact admin to delete and create a new reservation if needed.');
      return;
    }
    
    // compute itemName if missing
    const res = { ...reservation };
    if (!res.itemName) {
      if (res.item_type === 'equipment') {
        const eq = equipmentList.find(e => e.id === res.item_id);
        res.itemName = eq ? `${eq.name} (#${eq.item_number})` : '';
        res.equipmentId = res.item_id;
      } else if (res.item_type === 'room') {
        const rm = roomList.find(r => r.id === res.item_id);
        res.itemName = rm ? rm.name : '';
        res.equipmentId = res.item_id;
      }
    }
    setActiveReservation(res);
    const normalizeDateForInput = (d) => {
      if (!d) return '';
      // if format is dd/mm/yyyy convert to yyyy-mm-dd
      if (d.includes('/')) {
        const parts = d.split('/').map(p => p.padStart(2, '0'));
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          return `${yyyy}-${mm}-${dd}`;
        }
      }
      // if already yyyy-mm-dd or ISO, try to extract yyyy-mm-dd
      try {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
      } catch (e) {}
      return d;
    };

    setEditReservationData({
      dateNeeded: normalizeDateForInput(res.date_needed || res.dateNeeded),
      timeNeeded: res.time_needed || res.timeNeeded || '',
      timeFrom: res.time_from || res.timeFrom || '',
      // clear timeTo for equipment reservations (no end time)
      timeTo: res.item_type === 'equipment' ? '' : (res.time_to || res.timeTo || ''),
      purpose: res.purpose
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    // Clear previous errors
    setEditModalError('');
    
    // Validate for equipment (timeNeeded) or room (timeFrom/timeTo)
    if (!editReservationData.dateNeeded || !editReservationData.purpose) {
      setEditModalError('Please fill in all fields');
      return;
    }
    // Determine room-edit based on the actual reservation item type (more reliable)
    const isRoomEdit = activeReservation && activeReservation.item_type === 'room';
    if (isRoomEdit) {
      // ensure times are within office hours (allow end time to equal close)
      if (!isWithinOfficeHours(editReservationData.dateNeeded, editReservationData.timeFrom, false) || !isWithinOfficeHours(editReservationData.dateNeeded, editReservationData.timeTo, true)) {
        setEditModalError('Room reservation must be between 7:30 AM and 5:00 PM on weekdays (Monday-Friday).');
        return;
      }
      if (!editReservationData.timeFrom || !editReservationData.timeTo) {
        setEditModalError('Please provide both start and end times');
        return;
      }
      if (editReservationData.timeFrom >= editReservationData.timeTo) {
        setEditModalError('End time must be after start time');
        return;
      }
      
      // Block lunch time (12:00 PM - 1:00 PM) for room reservations
      const toMinutes = (t) => {
        if (!t) return null;
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm;
      };
      const editedStart = toMinutes(editReservationData.timeFrom);
      const editedEnd = toMinutes(editReservationData.timeTo);
      const LUNCH_START = 12 * 60;
      const LUNCH_END = 13 * 60;
      if (editedStart < LUNCH_END && LUNCH_START < editedEnd) {
        setEditModalError('Room reservation cannot overlap lunch break (12:00 PM - 1:00 PM). Please choose another time.');
        return;
      }
    } else {
      // Equipment reservation validation
      if (!editReservationData.timeNeeded) {
        setEditModalError('Please provide a time');
        return;
      }
      
      // Check if time is within office hours
      if (!isWithinOfficeHours(editReservationData.dateNeeded, editReservationData.timeNeeded)) {
        // Determine day to provide appropriate error message
        let dateObj;
        if (editReservationData.dateNeeded.includes('/')) {
          const parts = editReservationData.dateNeeded.split('/').map(p => parseInt(p, 10));
          if (parts.length === 3) {
            const [d, m, y] = parts;
            dateObj = new Date(y, (m || 1) - 1, d || 1);
          } else {
            dateObj = new Date(editReservationData.dateNeeded);
          }
        } else {
          dateObj = new Date(editReservationData.dateNeeded);
        }
        const dayOfWeek = dateObj.getDay();
        
        if (dayOfWeek === 0) {
          setEditModalError('Equipment cannot be reserved on Sundays. Please choose another date.');
          return;
        } else if (dayOfWeek === 6) {
          setEditModalError('Equipment can only be reserved on Saturdays between 8:00 AM and 12:00 PM. Please choose another time.');
          return;
        } else {
          setEditModalError('Equipment can only be reserved between 7:30 AM and 5:00 PM on weekdays. Please choose another time.');
          return;
        }
      }
      
      // Check if time is during lunch break (12:00 PM - 1:00 PM)
      const [hours, minutes] = editReservationData.timeNeeded.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      const LUNCH_START = 12 * 60;
      const LUNCH_END = 13 * 60;
      if (totalMinutes >= LUNCH_START && totalMinutes < LUNCH_END) {
        setEditModalError('Equipment cannot be reserved during lunch time (12:00 PM - 1:00 PM). Please choose a different time.');
        return;
      }
    }
    
    // Determine if this is an equipment or room reservation
    const isEquipmentReservation = equipmentReservations.some(r => r.id === activeReservation.id);
    
    if (isEquipmentReservation) {
      // prepare snake_case payload expected by backend
      const payload = {
        item_type: 'equipment',
        date_needed: editReservationData.dateNeeded,
        time_from: editReservationData.timeNeeded,
        time_to: editReservationData.timeNeeded,
        purpose: editReservationData.purpose
      };

      // persist edit to backend
      fetch(`${API_BASE_URL}/reservations/${activeReservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (res.ok) return res.json();
          return res.json().then(data => Promise.reject(data));
        })
        .then(updated => {
          // refresh reservations from server to ensure UI matches DB
          refreshReservations();
          setShowEditModal(false);
          setActiveReservation(null);
          setEditModalError('');
        })
        .catch(err => {
          console.error('Failed to update equipment reservation', err);
          const errorMsg = err.detail || 'Unable to update reservation.';
          setEditModalError(errorMsg);
        });
    } else {
      // Check overlap with other room reservations for same room/date
      const toMinutes = (t) => {
        if (!t) return null;
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm;
      };
      const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

      const editedStart = toMinutes(editReservationData.timeFrom);
      const editedEnd = toMinutes(editReservationData.timeTo);
      
      if (editedStart == null || editedEnd == null) {
        setEditModalError('Invalid time format.');
        return;
      }

      // find the room id for this reservation
      const roomId = activeReservation.equipmentId;
      const others = roomReservations.filter(r => r.equipmentId === roomId && r.id !== activeReservation.id && r.dateNeeded === editReservationData.dateNeeded);
      const conflict = others.some(r => {
        const exStart = toMinutes(r.timeFrom || r.timeNeeded);
        const exEnd = toMinutes(r.timeTo || r.timeNeeded);
        if (exStart == null || exEnd == null) return false;
        return overlaps(editedStart, editedEnd, exStart, exEnd);
      });

      if (conflict) {
        setEditModalError('Edited time overlaps an existing reservation for this room. Please choose another time.');
        return;
      }

      // prepare snake_case payload for room update
      const payload = {
        date_needed: editReservationData.dateNeeded,
        time_from: editReservationData.timeFrom,
        time_to: editReservationData.timeTo,
        purpose: editReservationData.purpose
      };

      // persist edit
      fetch(`${API_BASE_URL}/reservations/${activeReservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      })
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(updated => {
          // refresh reservations from server to ensure UI matches DB
          refreshReservations();
          setShowEditModal(false);
          setActiveReservation(null);
          setEditModalError('');
        })
        .catch(err => {
          console.error('Failed to update room reservation', err);
          setEditModalError('Unable to update reservation.');
        });
    }
  };

  const handleDeleteClick = (reservation) => {
    setActiveReservation(reservation);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    // Determine if this is an equipment or room reservation based on which array contains it
    const isEquipmentReservation = equipmentReservations.some(r => r.id === activeReservation.id);
    
    const performDelete = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reservations/${activeReservation.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!res.ok) {
          console.error('failed to delete reservation on server');
        }
      } catch (err) {
        console.error('error deleting reservation', err);
      }
    };

    // optimistically update UI
    if (isEquipmentReservation) {
      // Mark equipment as available again
      if (activeReservation.equipmentId) {
        const updatedEquipmentList = equipmentList.map(eq => 
          eq.id === activeReservation.equipmentId 
            ? { ...eq, available: true } 
            : eq
        );
        setEquipmentList(updatedEquipmentList);
      }
      setEquipmentReservations(equipmentReservations.filter(r => r.id !== activeReservation.id));
    } else {
      setRoomReservations(roomReservations.filter(r => r.id !== activeReservation.id));
    }

    performDelete().then(() => refreshReservations());
    
    setShowDeleteConfirm(false);
    setActiveReservation(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setActiveReservation(null);
  };

  // Process chat input to create reservations
  // Helper function to format date nicely
  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Helper function to format time nicely
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // NOTE: `isWithinOfficeHours` helper is already defined earlier in this file

  const processReservationFromChat = async (userMessage) => {
    const input = userMessage.toLowerCase();
    
    // Merge with existing reservation context if we're collecting information
    // Use context values if current detection didn't find them
    // let useContext = reservationContext.isActive; // Removed unused variable
    
    // Equipment detection - more flexible matching (supports multiple equipment)
    const equipmentTypes = {
      'speaker': 'SPEAKER',
      'microphone': 'MICROPHONE',
      'mic': 'MICROPHONE',
      'hdmi': 'HDMI',
      'cable': 'EXTENSION CORD',
      'extension': 'EXTENSION CORD',
      'extension cord': 'EXTENSION CORD',
      'flag': 'FLAG',
      'tv': 'TV',
      'projector': 'PROJECTOR'
    };
    
    // Detect multiple equipment items
    let detectedEquipmentList = [];
    let detectedEquipmentFromDBList = [];
    
    // Check for patterns like "1 speaker at 1 microphone" or "speaker and microphone"
    // const connectors = ['at', 'and', '&', 'at', 'saka', 'tsaka']; // Removed unused variable
    // const equipmentPatterns = []; // Removed unused variable
    
    // First, try to find equipment by keywords with quantity detection
    // Structure: { type: 'MICROPHONE', quantity: 2 }
    let equipmentWithQuantities = [];
    
    for (let [key, value] of Object.entries(equipmentTypes)) {
      // Pattern 1: "2 microphones" or "2 microphone" (with quantity)
      let regex = new RegExp(`(\\d+)\\s+${key}s?\\b`, 'i');
      let match = input.match(regex);
      let quantity = 1;
      
      if (match) {
        // Extract quantity from pattern 1
        quantity = parseInt(match[1]);
      } else {
        // Pattern 2: Just "microphone" or "microphones" (no quantity, default to 1)
        regex = new RegExp(`\\b${key}s?\\b`, 'i');
        match = input.match(regex);
      }
      
      if (match) {
        // Check if this equipment type is already detected
        const existing = equipmentWithQuantities.find(e => e.type === value);
        if (existing) {
          // Use the higher quantity if mentioned multiple times
          existing.quantity = Math.max(existing.quantity, quantity);
        } else {
          equipmentWithQuantities.push({ type: value, quantity: quantity });
        }
      }
    }
    
    // Convert to simple list for backward compatibility
    for (const eq of equipmentWithQuantities) {
      if (!detectedEquipmentList.includes(eq.type)) {
        detectedEquipmentList.push(eq.type);
      }
    }
    
    // If no equipment matched by keywords, try exact database search
    if (detectedEquipmentList.length === 0 && equipmentList && equipmentList.length > 0) {
      // Try to find equipment mentioned in message by checking against DB names
      for (const equipment of equipmentList) {
        const equipNameLower = equipment.name.toLowerCase();
        const equipFirstWord = equipNameLower.split(' ')[0];
        
        // Check if equipment name or first word is in the input
        if (input.includes(equipNameLower) || input.includes(equipFirstWord)) {
          if (!detectedEquipmentFromDBList.find(e => e.id === equipment.id)) {
            detectedEquipmentFromDBList.push(equipment);
          }
        }
      }
    }
    
    // For backward compatibility, keep single equipment detection
    let detectedEquipment = detectedEquipmentList.length > 0 ? detectedEquipmentList[0] : null;
    let detectedEquipmentFromDB = detectedEquipmentFromDBList.length > 0 ? detectedEquipmentFromDBList[0] : null;
    
    // Room detection (e.g., "room 213", "213", "213a")
    const roomMatch = input.match(/(?:room\s+)?(\d{3}[a-z]?)/i);
    let detectedRoom = null;
    if (roomMatch) {
      const roomNum = roomMatch[1];
      detectedRoom = roomList.find(r => r.room_number.toLowerCase().includes(roomNum.toLowerCase()));
    }
    
    // Time detection (e.g., "9am", "09:00", "2:30pm", "4pm", "4 pm")
    let detectedTime = null;
    
    // Pattern 1: "4pm", "4 pm", "9am" (hour with am/pm, no minutes)
    let timeMatch = input.match(/(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const ampm = timeMatch[2].toLowerCase();
      if (ampm === 'pm' && hour !== 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      detectedTime = `${String(hour).padStart(2, '0')}:00:00`;
    } else {
      // Pattern 2: "4:30pm", "09:30am", "14:30" (hour:minutes with optional am/pm)
      timeMatch = input.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const min = timeMatch[2];
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        if (ampm) {
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
        } else {
          // If no am/pm and hour > 12, assume 24-hour format
          // If hour <= 12, could be ambiguous, but we'll assume it's as-is
        }
        
        detectedTime = `${String(hour).padStart(2, '0')}:${min}:00`;
      }
    }
    
    // Date detection (e.g., "today", "tomorrow", "bukas", "march 16", "sa march 17", "3/16", "march 16, 2026")
    let detectedDate = null;
    
    // Try to parse specific dates FIRST (before relative dates) to avoid conflicts
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december',
                       'jan', 'feb', 'mar', 'apr', 'may', 'jun',
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    // Pattern: "march 16", "sa march 17", "march 16, 2026", "March 18", or "mar 16" 
    // Find month name, then find the next number (day) that appears after it (allowing words in between)
    const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
    const monthMatch = input.match(monthPattern);
    
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase();
      const monthStartIndex = monthMatch.index + monthMatch[0].length;
      
      // Look for day number after the month
      // Try to find the number that's most likely the day (closest to month, between 1-31)
      const afterMonth = input.substring(monthStartIndex).trim();
      
      // Find all potential day numbers after the month
      // We'll prioritize the one that's closest to the month and makes sense as a date
      let dayMatch = null;
      let bestMatch = null;
      let bestMatchIndex = Infinity;
      
      // Pattern 1: Direct match "march 18" or "march 18, 2026" - most common and reliable
      // Match number at start, optionally followed by comma+year, then space/time/end
      // Handles: "18", "18 11am", "18 3pm", "18, 2026", "18 9:00am"
      dayMatch = afterMonth.match(/^(\d{1,2})(?:\s*,\s*(\d{4}))?(?:\s+(?:am|pm|\d)|$|,)/i);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          bestMatch = dayMatch;
          bestMatchIndex = 0;
        }
      }
      
      // Pattern 2: Number followed by time indicators (very reliable for "march 18 3pm" or "march 18 11am")
      // This handles "18 3pm", "18 11am", or "18 9:00am" when Pattern 1 doesn't match
      if (!bestMatch) {
        // Match: number, space, then time (am/pm or hour:minute or just hour)
        dayMatch = afterMonth.match(/^(\d{1,2})\s+(?:am|pm|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day >= 1 && day <= 31 && dayMatch.index < bestMatchIndex) {
            bestMatch = dayMatch;
            bestMatchIndex = dayMatch.index;
          }
        }
      }
      
      // Pattern 2b: More explicit for "march 18 3pm" - number followed by space and time
      if (!bestMatch) {
        dayMatch = afterMonth.match(/^(\d{1,2})\s+(\d{1,2})\s*(am|pm)\b/i);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day >= 1 && day <= 31 && dayMatch.index < bestMatchIndex) {
            bestMatch = dayMatch;
            bestMatchIndex = dayMatch.index;
          }
        }
      }
      
      // Pattern 3: With optional single word like "sa march 18" or "march 18"
      if (!bestMatch) {
        dayMatch = afterMonth.match(/^(?:\w+\s+)?(\d{1,2})(?:\s+(?:am|pm|\d)|$|,)/i);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day >= 1 && day <= 31 && dayMatch.index < bestMatchIndex) {
            bestMatch = dayMatch;
            bestMatchIndex = dayMatch.index;
          }
        }
      }
      
      // Pattern 4: More flexible - find first valid day number (1-31) after month
      if (!bestMatch) {
        // Find all numbers and pick the first one that's a valid day
        const numberPattern = /\b(\d{1,2})\b/g;
        let match;
        while ((match = numberPattern.exec(afterMonth)) !== null) {
          const day = parseInt(match[1]);
          if (day >= 1 && day <= 31 && match.index < bestMatchIndex) {
            // Check if it's followed by something that suggests it's a date (not equipment count)
            const afterNum = afterMonth.substring(match.index + match[0].length).trim();
            // If followed by time, comma, space+number (time), or end, it's likely a date
            if (afterNum.match(/^(am|pm|:|\d{4}|,|\s+\d|$)/i) || match.index === 0) {
              bestMatch = match;
              bestMatchIndex = match.index;
              break; // Take the first valid day number
            }
          }
        }
      }
      
      if (bestMatch) {
        const day = parseInt(bestMatch[1]);
        const year = bestMatch[2] ? parseInt(bestMatch[2]) : new Date().getFullYear();
        
        // Only accept if day is a valid day number (1-31)
        if (day >= 1 && day <= 31) {
          let monthIndex = monthNames.indexOf(monthName);
          if (monthIndex >= 12) monthIndex -= 12; // Handle abbreviations
          
          if (monthIndex >= 0) {
            // Create date string directly to avoid timezone issues with toISOString()
            // Format: YYYY-MM-DD
            const yearStr = String(year);
            const monthStr = String(monthIndex + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            detectedDate = `${yearStr}-${monthStr}-${dayStr}`;
            
            // Validate the date is valid (e.g., not Feb 30)
            const date = new Date(year, monthIndex, day);
            if (date.getMonth() !== monthIndex || date.getDate() !== day) {
              // Invalid date (e.g., Feb 30), reset to null
              detectedDate = null;
            }
          }
        }
      }
    }
    
    // If no specific date found, check for relative dates
    // IMPORTANT: Only use relative dates if NO month name was found in the input
    // This prevents "tomorrow" from overriding explicit dates like "march 18"
    if (!detectedDate) {
      // Only check for relative dates if we didn't find any month name
      const hasMonthName = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(input);
      
      if (!hasMonthName) {
        if (input.includes('today') || input.includes('ngayon')) {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          detectedDate = `${year}-${month}-${day}`;
        } else if (input.includes('tomorrow') || input.includes('bukas')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const year = tomorrow.getFullYear();
          const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const day = String(tomorrow.getDate()).padStart(2, '0');
          detectedDate = `${year}-${month}-${day}`;
        }
      }
      
      // Still check for slash format dates even if month name was found (in case user uses both)
      if (!detectedDate) {
        // Pattern: "3/16" or "03/16/2026" or "3-16"
        const slashDateMatch = input.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
        if (slashDateMatch) {
          let month = parseInt(slashDateMatch[1]);
          let day = parseInt(slashDateMatch[2]);
          let year = slashDateMatch[3] ? parseInt(slashDateMatch[3]) : new Date().getFullYear();
          
          // Handle 2-digit years
          if (year < 100) {
            year += 2000;
          }
          
          // Check if it's MM/DD or DD/MM format (assuming MM/DD for now)
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const date = new Date(year, month - 1, day);
            // Validate the date
            if (date.getMonth() === month - 1 && date.getDate() === day) {
              // Create date string directly to avoid timezone issues
              const yearStr = String(year);
              const monthStr = String(month).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              detectedDate = `${yearStr}-${monthStr}-${dayStr}`;
            }
          }
        }
      }
    }
    
    // Purpose detection - extract purpose from phrases like "para sa", "for", etc.
    let detectedPurpose = null;
    
    // Find the position of purpose-indicating phrases
    const purposeIndicators = [
      { phrase: /para\s+sa\s+/i, index: input.search(/para\s+sa\s+/i) },
      { phrase: /for\s+/i, index: input.search(/for\s+/i) },
      { phrase: /pang\s+/i, index: input.search(/pang\s+/i) },
      { phrase: /para\s+/i, index: input.search(/para\s+/i) }
    ].filter(p => p.index >= 0).sort((a, b) => a.index - b.index);
    
    if (purposeIndicators.length > 0) {
      const indicator = purposeIndicators[0];
      const startIndex = input.search(indicator.phrase) + input.match(indicator.phrase)[0].length;
      
      // Find where the purpose ends (before time/date keywords)
      const endMarkers = [
        /\s+(bukas|tomorrow|today|ngayon)\s+/i,
        /\s+(\d{1,2})\s*(am|pm)\b/i,
        /\s+(\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
        /\s+(march|april|may|june|july|august|september|october|november|december|january|february)\s+/i,
        /\s+(\d{1,2})[/-](\d{1,2})/i
      ];
      
      let endIndex = input.length;
      for (const marker of endMarkers) {
        const match = input.substring(startIndex).match(marker);
        if (match) {
          endIndex = startIndex + match.index;
          break;
        }
      }
      
      let purpose = input.substring(startIndex, endIndex).trim();
      
      // Clean up: remove any remaining time/date words
      purpose = purpose.replace(/\s+(bukas|tomorrow|today|ngayon|tom|am|pm|\d+).*$/i, '');
      purpose = purpose.trim();
      
      if (purpose.length > 0 && purpose.length < 50) {
        // Capitalize first letter of each word, but keep common Filipino words lowercase
        const lowercaseWords = ['ng', 'sa', 'at', 'ang', 'mga', 'na', 'o', 'ni', 'nang', 'kung', 'para'];
        detectedPurpose = purpose.split(' ').map((word, index) => {
          const wordLower = word.toLowerCase();
          // Keep common Filipino words lowercase (except if it's the first word)
          if (index > 0 && lowercaseWords.includes(wordLower)) {
            return wordLower;
          }
          // Capitalize first letter
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
      }
    }
    
    // If no purpose found via phrases, check for common keywords
    if (!detectedPurpose) {
      const purposes = {
        'training': 'Training',
        'meeting': 'Meeting',
        'presentation': 'Presentation',
        'seminar': 'Seminar',
        'workshop': 'Workshop',
        'conference': 'Conference',
        'event': 'Event',
        'class': 'Class',
        'session': 'Session',
        'zumba': 'Zumba',
        'exercise': 'Exercise',
        'fitness': 'Fitness',
        'dance': 'Dance',
        'yoga': 'Yoga',
        'party': 'Party',
        'celebration': 'Celebration',
        'birthday': 'Birthday',
        'anniversary': 'Anniversary'
      };
      
      for (let [key, value] of Object.entries(purposes)) {
        if (input.includes(key)) {
          detectedPurpose = value;
          break;
        }
      }
    }
    
    // Merge detected values with context (use context if detection failed)
    // Always merge - use detected value if available, otherwise use context
    if (!detectedEquipment && !detectedEquipmentFromDB && detectedEquipmentList.length === 0 && reservationContext.equipment) {
      detectedEquipment = reservationContext.equipment;
    }
    if (!detectedRoom && reservationContext.room) {
      detectedRoom = reservationContext.room;
    }
    if (!detectedDate && reservationContext.date) {
      detectedDate = reservationContext.date;
    }
    if (!detectedTime && reservationContext.time) {
      detectedTime = reservationContext.time;
    }
    if (!detectedPurpose && reservationContext.purpose) {
      detectedPurpose = reservationContext.purpose;
    }
    
    // Also merge equipment lists from context
    if (detectedEquipmentList.length === 0 && reservationContext.equipmentList) {
      detectedEquipmentList = reservationContext.equipmentList;
    }
    if (detectedEquipmentFromDBList.length === 0 && reservationContext.equipmentFromDBList) {
      detectedEquipmentFromDBList = reservationContext.equipmentFromDBList;
    }
    if (equipmentWithQuantities.length === 0 && reservationContext.equipmentWithQuantities) {
      equipmentWithQuantities = reservationContext.equipmentWithQuantities;
    }
    
    // Check if equipment/room list is loaded
    if ((detectedEquipment || detectedEquipmentFromDB) && (!equipmentList || equipmentList.length === 0)) {
      return {
        response: 'Please wait while I load the equipment list... Try again in a moment.',
        suggestions: ['Retry', 'Cancel'],
        created: false
      };
    }

    if (detectedRoom && (!roomList || roomList.length === 0)) {
      return {
        response: 'Please wait while I load the room list... Try again in a moment.',
        suggestions: ['Retry', 'Cancel'],
        created: false
      };
    }
    
    // Determine what we have (after merging with context)
    const hasEquipment = detectedEquipment || detectedEquipmentFromDB || detectedEquipmentList.length > 0 || detectedEquipmentFromDBList.length > 0;
    const hasRoom = detectedRoom !== null;
    const hasItem = hasEquipment || hasRoom;
    
    // Update context with newly detected values (merge with existing context)
    // Store the actual equipment object/ID, not just the type
    const updatedContext = {
      equipment: (hasEquipment ? (detectedEquipment || detectedEquipmentFromDB || (detectedEquipmentList.length > 0 ? detectedEquipmentList[0] : null)) : null) || reservationContext.equipment,
      equipmentList: detectedEquipmentList.length > 0 ? detectedEquipmentList : (reservationContext.equipmentList || []),
      equipmentFromDBList: detectedEquipmentFromDBList.length > 0 ? detectedEquipmentFromDBList : (reservationContext.equipmentFromDBList || []),
      equipmentWithQuantities: equipmentWithQuantities.length > 0 ? equipmentWithQuantities : (reservationContext.equipmentWithQuantities || []),
      room: detectedRoom || reservationContext.room,
      date: detectedDate || reservationContext.date,
      time: detectedTime || reservationContext.time,
      purpose: detectedPurpose || reservationContext.purpose,
      isActive: true
    };
    
    // Check if we have an item first
    if (!hasItem) {
      setReservationContext(updatedContext);
      return {
        response: 'I can help you make a reservation! What would you like to reserve?\n\n• Equipment (speaker, microphone, etc.)\n• Room (room number)',
        suggestions: ['Speaker', 'Microphone', 'Room', 'Cancel'],
        created: false
      };
    }
    
    // Ask for missing information one at a time, prioritizing
    if (!detectedDate) {
      setReservationContext(updatedContext);
      return {
        response: `What date would you like to reserve the item?\n\nYou can say:\n• Today\n• Tomorrow\n• A specific date (e.g., March 18, March 20)`,
        suggestions: ['Today', 'Tomorrow', 'March 18', 'March 20'],
        created: false
      };
    }
    
    if (!detectedTime) {
      setReservationContext(updatedContext);
      const dateInfo = formatDate(detectedDate);
      return {
        response: `What time would you like the reservation on ${dateInfo}?\n\nYou can say:\n• 9am, 2pm, 3:30pm\n• Or any time format`,
        suggestions: ['9:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'],
        created: false
      };
    }

    // If purpose is missing, ask for it (but make it optional with a default)
    if (!detectedPurpose) {
      // Check if user wants to skip purpose
      if (input.includes('skip') || input.includes('cancel') || input.includes('wag na') || input.includes('ok lang')) {
        detectedPurpose = 'As requested';
      } else {
        setReservationContext(updatedContext);
        const dateInfo = formatDate(detectedDate);
        const timeInfo = formatTime(detectedTime);
        return {
          response: `What's the purpose of this reservation?\n\n📋 Reservation Summary:\n   Date: ${dateInfo}\n   Time: ${timeInfo}\n\nYou can say:\n• Training, Meeting, Presentation\n• Or say "Skip" to use default`,
          suggestions: ['Training', 'Meeting', 'Presentation', 'Skip'],
          created: false
        };
      }
    }
    
    // All information collected - before creating reservation, enforce office hours
    // Validate date/time against AVRC office hours
    if (!isWithinOfficeHours(detectedDate, detectedTime)) {
      const dateInfo = formatDate(detectedDate);
      const timeInfo = formatTime(detectedTime);

      // Determine day of week for friendlier message
      const [year, month, day] = detectedDate.split('-').map(Number);
      const dt = new Date(year, month - 1, day);
      const dayOfWeek = dt.getDay(); // 0 = Sunday

      let explanation = '';
      if (dayOfWeek === 0) {
        explanation = 'AVRC is closed on Sundays.';
      } else if (dayOfWeek === 6) {
        explanation = 'Saturday office hours are from 8:00 AM to 12:00 PM only.';
      } else {
        explanation = 'Office hours are 7:30 AM–12:00 PM and 1:00 PM–5:00 PM (Monday–Friday).';
      }

      setReservationContext({
        equipment: detectedEquipment || detectedEquipmentFromDB || (detectedEquipmentList.length > 0 ? detectedEquipmentList[0] : null),
        room: detectedRoom,
        date: detectedDate,
        time: null,
        purpose: detectedPurpose,
        isActive: true
      });

      return {
        response: `I can't create this reservation because it's outside AVRC office hours.\n\n📋 Requested:\n   Date: ${dateInfo}\n   Time: ${timeInfo}\n\n${explanation}\n\nPlease enter a new time within office hours for that date.`,
        suggestions: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
        created: false
      };
    }

    // All information valid - clear context and proceed to create reservation
    setReservationContext({ equipment: null, room: null, date: null, time: null, purpose: null, isActive: false });

    // AUTO-CREATE THE RESERVATION
    try {
      if (detectedEquipment || detectedEquipmentFromDB || detectedEquipmentList.length > 0 || detectedEquipmentFromDBList.length > 0) {
        // Handle multiple equipment reservations
        const equipmentToReserve = [];
        
        // Collect all equipment to reserve with quantities
        if (detectedEquipmentList.length > 0) {
          // Find available equipment for each detected type with quantity
          for (const equipType of detectedEquipmentList) {
            // Get the quantity for this equipment type
            const equipWithQty = equipmentWithQuantities.find(e => e.type === equipType);
            const quantity = equipWithQty ? equipWithQty.quantity : 1;
            
            // Find ALL available equipment of this type (not just the first one)
            let availableItems = equipmentList.filter(e => 
              getEquipCategory(e.name) === equipType && 
              (e.available === true || e.status?.toLowerCase() === 'available')
            );
            
            // If not found by exact category match, try partial name match
            if (availableItems.length === 0) {
              availableItems = equipmentList.filter(e => 
                (e.available === true || e.status?.toLowerCase() === 'available') &&
                (e.name.toUpperCase().includes(equipType.toUpperCase()) ||
                getEquipCategory(e.name).toUpperCase().includes(equipType.toUpperCase()))
              );
            }
            
            // Take only the requested quantity (or all available if less than requested)
            const itemsToAdd = availableItems.slice(0, quantity);
            
            // Add items that aren't already in the list
            for (const item of itemsToAdd) {
              if (!equipmentToReserve.find(e => e.id === item.id)) {
                equipmentToReserve.push(item);
              }
            }
          }
        }
        
        // Add equipment from DB matches
        if (detectedEquipmentFromDBList.length > 0) {
          for (const equip of detectedEquipmentFromDBList) {
            if ((equip.available === true || equip.status?.toLowerCase() === 'available') &&
                !equipmentToReserve.find(e => e.id === equip.id)) {
              equipmentToReserve.push(equip);
            }
          }
        }
        
        // Fallback to single equipment detection (for backward compatibility)
        if (equipmentToReserve.length === 0) {
          let equipment = equipmentList.find(e => 
            getEquipCategory(e.name) === detectedEquipment && 
            (e.available === true || e.status?.toLowerCase() === 'available')
          );
          
          if (!equipment && detectedEquipmentFromDB) {
            if (detectedEquipmentFromDB.available === true || detectedEquipmentFromDB.status?.toLowerCase() === 'available') {
              equipment = detectedEquipmentFromDB;
            }
          }
          
          if (!equipment) {
            equipment = equipmentList.find(e => 
              (e.available === true || e.status?.toLowerCase() === 'available') &&
              (e.name.toUpperCase().includes(detectedEquipment?.toUpperCase()) ||
              getEquipCategory(e.name).toUpperCase().includes(detectedEquipment?.toUpperCase()))
            );
          }
          
          if (equipment) {
            equipmentToReserve.push(equipment);
          }
        }
        
        // If no equipment found, show available alternatives
        if (equipmentToReserve.length === 0) {
          const availableEquipment = equipmentList.filter(e => e.available === true || e.status?.toLowerCase() === 'available');
          
          if (availableEquipment.length === 0) {
            return {
              response: `Sorry, there's no equipment available at the moment. All items are currently reserved.`,
              suggestions: ['Check Later', 'Other Equipment', 'Help'],
              created: false
            };
          }
          
          return {
            response: `I'm having trouble finding the requested equipment. Here's what's available:\n${availableEquipment.slice(0, 5).map(e => `• ${e.name}`).join('\n')}\n\nWould you like to reserve one of these instead?`,
            suggestions: availableEquipment.slice(0, 4).map(e => e.name),
            created: false
          };
        }

        // Create reservations for all equipment
        const createdReservations = [];
        const failedReservations = [];
        
        for (const equipment of equipmentToReserve) {
          const reservationData = {
            item_type: 'equipment',
            item_id: equipment.id,
            date_needed: detectedDate,
            time_from: detectedTime,
            time_to: detectedTime,
            purpose: detectedPurpose
          };

          console.log('[CHAT] Creating equipment reservation:', reservationData, 'Equipment:', equipment);

          try {
            const response = await fetch(`${API_BASE_URL}/reservations/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              },
              body: JSON.stringify(reservationData)
            });

            if (response.ok) {
              const reservation = await response.json();
              console.log('[CHAT] Reservation created:', reservation);
              createdReservations.push(equipment.name);
            } else {
              const error = await response.json();
              console.error('[CHAT] Reservation error:', error);
              failedReservations.push({ name: equipment.name, error: error.detail || 'Unknown error' });
            }
          } catch (err) {
            console.error('[CHAT] Reservation exception:', err);
            failedReservations.push({ name: equipment.name, error: 'Network error' });
          }
        }
        
        // Refresh data to show updated availability
        await refreshReservations();
        
        // Also refresh equipment list to update availability status
        try {
          const equipRes = await fetch(`${API_BASE_URL}/equipment/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
          });
          if (equipRes.ok) {
            const equipData = await equipRes.json();
            setEquipmentList(equipData);
          }
        } catch (err) {
          console.error('[CHAT] Failed to refresh equipment list:', err);
        }
        
        // Format response based on results
        const formattedDate = formatDate(detectedDate);
        const formattedTime = formatTime(detectedTime);
        
        if (createdReservations.length > 0) {
          let responseText = '';
          
          if (createdReservations.length === 1) {
            responseText = `✓ Perfect! I've successfully reserved the ${createdReservations[0]} for you.\n\n📋 Reservation Details:\n   🗓️  Date: ${formattedDate}\n   ⏰  Time: ${formattedTime}\n   📌  Purpose: ${detectedPurpose}\n\n✅ Status: Pending approval\n\n💡 Check your MY RESERVATION tab to see it!`;
          } else {
            responseText = `✓ Perfect! I've successfully reserved ${createdReservations.length} items for you:\n\n${createdReservations.map((name, idx) => `   ${idx + 1}. ${name}`).join('\n')}\n\n📋 Reservation Details:\n   🗓️  Date: ${formattedDate}\n   ⏰  Time: ${formattedTime}\n   📌  Purpose: ${detectedPurpose}\n\n✅ Status: Pending approval\n\n💡 Check your MY RESERVATION tab to see them!`;
          }
          
          if (failedReservations.length > 0) {
            responseText += `\n\n⚠️ Note: Some reservations failed:\n${failedReservations.map(f => `   • ${f.name}: ${f.error}`).join('\n')}`;
          }
          
          return {
            response: responseText,
            suggestions: ['New Reservation', 'View Reservations', 'Home'],
            created: createdReservations.length > 0
          };
        } else {
          return {
            response: `Sorry, I couldn't complete the reservations. ${failedReservations.map(f => `${f.name}: ${f.error}`).join(', ')}`,
            suggestions: ['Retry', 'Try Manual Form', 'Help'],
            created: false
          };
        }
      } else if (detectedRoom) {
        const reservationData = {
          room_id: detectedRoom.id,
          date_needed: detectedDate,
          time_from: detectedTime,
          time_to: detectedTime, // User can adjust this later
          purpose: detectedPurpose
        };

        console.log('[CHAT] Creating room reservation:', reservationData);

        const response = await fetch(`${API_BASE_URL}/room-reservations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(reservationData)
        });

        if (response.ok) {
          const reservation = await response.json();
          console.log('[CHAT] Room reservation created:', reservation);
          
          // Refresh data to show updated availability
          await refreshReservations();
          
          const formattedDate = formatDate(detectedDate);
          const formattedTime = formatTime(detectedTime);
          
          return {
            response: `✓ Excellent! I've successfully reserved ${detectedRoom.room_number} for you.\n\n📋 Reservation Details:\n   🗓️  Date: ${formattedDate}\n   ⏰  Time: ${formattedTime}\n   📌  Purpose: ${detectedPurpose}\n\n✅ Status: Pending approval\n\n💡 Check your MY RESERVATION tab!`,
            suggestions: ['New Reservation', 'View Reservations', 'Home'],
            created: true
          };
        } else {
          const error = await response.json();
          console.error('[CHAT] Room reservation error:', error);
          return {
            response: `Sorry, the room reservation couldn't be completed. ${error.detail || 'Please try again.'}`,
            suggestions: ['Retry', 'Try Manual Form', 'Help'],
            created: false
          };
        }
      }
    } catch (error) {
      console.error('[CHAT] Unexpected error:', error);
      return {
        response: 'Oops! Something went wrong. Please try the reservation form instead.',
        suggestions: ['Try Again', 'Manual Form', 'Help'],
        created: false
      };
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    // Add user message
    const userMessage = {
      id: chatMessages.length + 1,
      text: chatInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    const currentInput = chatInput;
    setChatInput('');
    
    const input = currentInput.toLowerCase();
    let botResponse = '';
    let suggestions = [];
    
    // Check if user is trying to make a reservation
    const reservationKeywords = ['reserve', 'book', 'need', 'require', 'want', 'could', 'can i', 'pwede', 'magpa'];
    const isReservationAttempt = reservationKeywords.some(keyword => input.includes(keyword));
    
    if (isReservationAttempt) {
      // Process reservation from chat
      const result = await processReservationFromChat(currentInput);
      
      const botMessage = {
        id: updatedMessages.length + 1,
        text: result.response,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: result.suggestions
      };
      setChatMessages([...updatedMessages, botMessage]);
    } else {
      // Original NLP logic for non-reservation queries
      // Detect equipment items mentioned
      const equipmentItems = ['speaker', 'microphone', 'mic', 'hdmi', 'cable', 'extension', 'flag', 'tv'];
      let detectedItem = null;
      for (let item of equipmentItems) {
        if (input.includes(item)) {
          detectedItem = item;
          break;
        }
      }
      
      if (input.includes('available') || input.includes('may available')) {
        if (detectedItem) {
          // Check how many of this equipment are available
          const equipmentCategory = detectedItem.toUpperCase();
          const availableItems = equipmentList.filter(eq => 
            getEquipCategory(eq.name).toUpperCase() === equipmentCategory && 
            (eq.available === true || eq.status?.toLowerCase() === 'available')
          );
          
          if (availableItems.length > 0) {
            botResponse = `✓ Great news! I found ${availableItems.length} available ${detectedItem}${availableItems.length > 1 ? 's' : ''}:\n\n${availableItems.slice(0, 3).map((eq, i) => `${i + 1}. ${eq.name} (#${eq.item_number})`).join('\n')}${availableItems.length > 3 ? `\n... and ${availableItems.length - 3} more` : ''}`;
            suggestions = [`Reserve ${detectedItem.charAt(0).toUpperCase() + detectedItem.slice(1)}`, 'Check Other Equipment', 'View All'];
          } else {
            botResponse = `Sorry, there are no available ${detectedItem}s right now. They are all currently reserved or under maintenance.`;
            suggestions = ['Check Other Equipment', 'View All Items', 'Create Reservation Request'];
          }
          setChatContext({ ...chatContext, searchedItem: detectedItem, lastReserved: 'equipment' });
        } else if (input.includes('room') || input.includes('213') || input.includes('214') || input.includes('215')) {
          // const roomPattern = input.match(/\d{3}[a-z]?/i); // Removed unused variable
          const availableRooms = roomList.filter(r => r.available === true);
          
          if (availableRooms.length > 0) {
            botResponse = `✓ Available rooms: ${availableRooms.slice(0, 3).map(r => r.name || r.room_number).join(', ')}${availableRooms.length > 3 ? ' and more' : ''}. Which would you like to reserve?`;
            suggestions = availableRooms.slice(0, 3).map(r => r.name || `Room ${r.room_number}`);
          } else {
            botResponse = `Sorry, no rooms are available right now. All rooms are booked.`;
            suggestions = ['Create Request', 'Check Equipment', 'Help'];
          }
        } else {
          botResponse = 'What would you like to check availability for?';
          suggestions = ['Equipment', 'Rooms'];
        }
      } else if (input.includes('view') || input.includes('my') || input.includes('reservation')) {
        botResponse = 'You can view all your reservations in the "MY RESERVATION" tab. Would you like me to show you something specific?';
        suggestions = ['Equipment Reservations', 'Room Reservations', 'Calendar View'];
      } else if (input.includes('thanks') || input.includes('thank') || input.includes('ok')) {
        botResponse = 'You\'re welcome! Feel free to ask me anything else. 😊';
        suggestions = ['Create New Reservation', 'Check Availability', 'Help'];
      } else if (input.includes('help') || input.includes('how')) {
        botResponse = 'I can help you with:\n• Reserve equipment or rooms by telling me what you need\n• Check available items\n• View your reservations\n• Get information about our services\n\nWhat would you like?';
        suggestions = ['Reserve Equipment', 'Reserve Room', 'My Reservations'];
      } else {
        botResponse = 'I can help you reserve equipment or rooms! Just tell me what you need, when, and for what purpose. 😊';
        suggestions = ['Reserve Equipment', 'Reserve Room', 'Help'];
      }

      const botMessage = {
        id: updatedMessages.length + 1,
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: suggestions
      };
      
      setChatMessages([...updatedMessages, botMessage]);
    }
  };

  const handleQuickAction = async (action) => {
    setChatInput(action);
    
    // Simulate sending the quick action
    const userMessage = {
      id: chatMessages.length + 1,
      text: action,
      sender: 'user',
      timestamp: new Date()
    };
    
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    
    // If we're in the middle of collecting reservation info, treat quick action
    // as a normal chat message and continue the reservation flow.
    if (reservationContext.isActive) {
      const result = await processReservationFromChat(action);

      const botMessage = {
        id: updatedMessages.length + 1,
        text: result.response,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: result.suggestions || []
      };

      setChatMessages([...updatedMessages, botMessage]);
      return;
    }

    // Otherwise, generate response based on quick action shortcuts
    let botResponse = '';
    let suggestions = [];
    
    // Check if action is a dynamic "Reserve [Equipment]" button
    if (action.startsWith('Reserve ') && !['Reserve Equipment', 'Reserve Room'].includes(action)) {
      const equipmentType = action.replace('Reserve ', '').trim();
      botResponse = `Great! Let me take you to reserve a ${equipmentType}. I'm filtering to show available ${equipmentType}s.`;
      setActiveTab('equipments');
      setSelectedCategory(equipmentType.toUpperCase());
      suggestions = ['Go to Equipment', 'Cancel', 'Help'];
    } else if (action === 'Check Availability') {
      if (chatContext.searchedItem) {
        // Check if there are available items of this type
        const itemsOfType = equipmentList.filter(eq => 
          eq.name.toLowerCase() === chatContext.searchedItem.toLowerCase()
        );
        const availableItems = itemsOfType.filter(eq => isEquipmentAvailable(eq));
        
        if (availableItems.length > 0) {
          botResponse = `Perfect! I'm showing you all available ${chatContext.searchedItem}s. You can reserve any of them right away!`;
        } else if (itemsOfType.length > 0) {
          botResponse = `Sorry, there are no available ${chatContext.searchedItem}s at the moment. All items are currently reserved or unavailable.`;
        } else {
          botResponse = `I couldn't find any ${chatContext.searchedItem}s in our inventory.`;
        }
        // Navigate to equipments tab and filter by searched item
        setActiveTab('equipments');
        setSelectedCategory(chatContext.searchedItem.toUpperCase());
        suggestions = [];
      } else {
        botResponse = 'Let me take you to see all available equipment and rooms!';
        setActiveTab('equipments');
        suggestions = [];
      }
    } else if (action === 'Check Other Equipment') {
      botResponse = 'Let me show you all our available equipment. You can browse and reserve anything you need!';
      setActiveTab('equipments');
      setSelectedCategory('ALL');
      suggestions = [];
    } else if (action === 'Check Other Items') {
      botResponse = 'Let me show you all our available items!';
      setActiveTab('equipments');
      suggestions = [];
    } else if (action === 'View All' || action === 'View All Items') {
      botResponse = 'Showing you everything we have available!';
      setActiveTab('equipments');
      setSelectedCategory('ALL');
      suggestions = [];
    } else if (action === 'Reserve Equipment') {
      botResponse = 'Perfect! Let me take you to the equipment reservation page. Click "Reserve Equipment" button above to get started.';
      setActiveTab('equipments');
      suggestions = [];
    } else if (action === 'Reserve Now') {
      botResponse = 'Great! I\'ll take you to complete the reservation now.';
      setActiveTab('equipments');
      suggestions = [];
    } else if (action === 'Reserve Room') {
      botResponse = 'Great! I\'ll help you reserve a room. Click "Reserve Room" button above to begin.';
      setActiveTab('rooms');
      suggestions = [];
    } else if (action === 'View Reservations') {
      botResponse = 'Click the "MY RESERVATION" tab to see all your upcoming reservations!';
      suggestions = [];
    } else if (action === 'Equipment Reservations' || action === 'Room Reservations' || action === 'Calendar View') {
      botResponse = `Showing you ${action}! Check the "MY RESERVATION" tab.`;
      setActiveTab('my-reservation');
      suggestions = [];
    } else if (action === 'Room 213' || action === 'Room 214' || action === 'Room 215') {
      botResponse = `${action} is a great choice! Let me take you to complete the reservation.`;
      setActiveTab('rooms');
      setSelectedRoomView(parseInt(action.replace('Room ', '')) === 213 ? 101 : parseInt(action.replace('Room ', '')) === 214 ? 102 : 103);
      suggestions = [];
      setChatContext({ ...chatContext, preferredRoom: action });
    } else if (action === 'Create Request' || action === 'Create Reservation Request') {
      botResponse = 'Got it! I can help you create a reservation request. What would you like to reserve?';
      suggestions = ['Equipment', 'Room', 'Help'];
    } else if (action === 'Equipment') {
      botResponse = 'What equipment would you like to reserve?';
      suggestions = [];
    } else if (action === 'Rooms') {
      botResponse = 'Which room would you like to reserve? We have rooms 213, 214, and 215 available.';
      suggestions = [];
    } else if (action === 'Go to Equipment') {
      setActiveTab('equipments');
      suggestions = [];
    } else if (action === 'Help') {
      botResponse = 'I can help you:\n• Check availability of equipment or rooms\n• Make reservations\n• View your existing reservations\n• Provide information about services\n\nWhat would you like to do?';
      suggestions = ['Reserve Equipment', 'Reserve Room', 'View Reservations'];
    } else if (action === 'Cancel') {
      botResponse = 'No problem! Is there anything else I can help you with?';
      suggestions = ['Reserve Equipment', 'Reserve Room', 'Help'];
    } else {
      botResponse = 'Got it! Let me help you with that.';
      suggestions = [];
    }
    
    const botMessage = {
      id: updatedMessages.length + 1,
      text: botResponse,
      sender: 'bot',
      timestamp: new Date(),
      suggestions: suggestions
    };
    
    setChatMessages([...updatedMessages, botMessage]);
    setChatInput('');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        const allUpcomingReservations = [...equipmentReservations, ...roomReservations].sort((a, b) => {
          return new Date(a.dateNeeded) - new Date(b.dateNeeded);
        }).slice(0, 4);

        return (
          <div className="dashboard-content" key={activeTab}>
            <div className="dashboard-header">
              <h1>Welcome, {userName}</h1>
              <p>Manage your reservations, view available equipment, and track your requests easily.</p>
            </div>
            <div className="dashboard-cards">
              <div className="dashboard-card">
                <h3>Equipment Reservation</h3>
                <button className="dashboard-btn" onClick={() => setActiveTab('equipments')}>Reserve Equipment</button>
              </div>
              <div className="dashboard-card">
                <h3>Room Reservation</h3>
                <button className="dashboard-btn" onClick={() => setActiveTab('rooms')}>Reserve Room</button>
              </div>
            </div>

            {allUpcomingReservations.length > 0 && (
              <div className="upcoming-reservations-section">
                <h2 className="upcoming-title">Upcoming Reservations</h2>
                <div className="upcoming-reservations-list">
                  {allUpcomingReservations.map(reservation => {
                    let displayName = reservation.itemName || reservation.roomName || '';
                    
                    // For equipment, append item number
                    if (reservation.item_type === 'equipment' || !reservation.item_type) {
                      const equipId = reservation.equipmentId || reservation.item_id || reservation.itemId;
                      if (equipId && equipmentList && equipmentList.length > 0) {
                        const found = equipmentList.find(e => String(e.id) === String(equipId));
                        if (found) {
                          displayName = `${found.name} #${found.item_number}`;
                        }
                      }
                    } else if (reservation.item_type === 'room') {
                      // For rooms, use the room name
                      const roomId = reservation.equipmentId || reservation.item_id || reservation.itemId || reservation.itemId;
                      if (roomId && roomList && roomList.length > 0) {
                        const foundRoom = roomList.find(r => String(r.id) === String(roomId) || String(r.id) === String(Number(roomId)));
                        if (foundRoom) {
                          // Ensure format is "Room XXX"
                          const roomName = foundRoom.name;
                          displayName = roomName.includes('Room') ? roomName : `Room ${roomName}`;
                        }
                      }
                    }
                    
                    return (
                      <div key={reservation.id} className="upcoming-item">
                        <div className="upcoming-item-name">
                          {displayName}
                        </div>
                        <div className="upcoming-item-date">
                          {formatDateWithMonthName(reservation.dateNeeded)} {formatReservationTime(reservation) ? `- ${formatReservationTime(reservation)}` : ''}
                        </div>
                        <div className="upcoming-item-purpose">
                          Purpose: {reservation.purpose}
                        </div>
                        <div className={`upcoming-status ${reservation.status?.toLowerCase() || 'pending'}`}>
                          {reservation.status || 'Pending'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      case 'my-reservation':
        const displayedReservations = reservationFilterTab === 'equipment' ? equipmentReservations : reservationFilterTab === 'room' ? roomReservations : [];
        
        return (
          <div className="dashboard-content" key={activeTab}>
            <h2 className="reservations-title">My Reservations</h2>
            
            <div className="reservation-tabs">
              <button 
                className={`reservation-tab-btn ${reservationFilterTab === 'equipment' ? 'active' : ''}`}
                onClick={() => setReservationFilterTab('equipment')}
              >
                Equipment Reservation
              </button>
              <button 
                className={`reservation-tab-btn ${reservationFilterTab === 'room' ? 'active' : ''}`}
                onClick={() => setReservationFilterTab('room')}
              >
                Room Reservation
              </button>
              <button 
                className={`reservation-tab-btn ${reservationFilterTab === 'calendar' ? 'active' : ''}`}
                onClick={() => setReservationFilterTab('calendar')}
              >
                Calendar
              </button>
            </div>

            {reservationFilterTab === 'calendar' ? (
              <div className="calendar-view">
                <div className="calendar-header">
                  <button onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}>← Previous</button>
                  <h3 className="calendar-month-year">
                    {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}>Next →</button>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '24px',
                  padding: '16px 0',
                  marginBottom: '16px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#fbbf24',
                      borderRadius: '3px'
                    }}></div>
                    <span style={{fontSize: '14px', color: '#666', fontWeight: '500'}}>Pending</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#10b981',
                      borderRadius: '3px'
                    }}></div>
                    <span style={{fontSize: '14px', color: '#666', fontWeight: '500'}}>Approved</span>
                  </div>
                </div>

                <div className="calendar-grid">
                  <div className="calendar-day-header">Sunday</div>
                  <div className="calendar-day-header">Monday</div>
                  <div className="calendar-day-header">Tuesday</div>
                  <div className="calendar-day-header">Wednesday</div>
                  <div className="calendar-day-header">Thursday</div>
                  <div className="calendar-day-header">Friday</div>
                  <div className="calendar-day-header">Saturday</div>

                  {(() => {
                    const firstDay = new Date(calendarYear, calendarMonth, 1);
                    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    const startingDayOfWeek = firstDay.getDay();
                    const days = [];

                    // Add empty cells for days before the month starts
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(
                        <div key={`empty-${i}`} className="calendar-day empty-day"></div>
                      );
                    }

                    // Add days of the month
                    const allReservations = [...equipmentReservations, ...roomReservations];
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayReservations = allReservations.filter(r => r.dateNeeded === dateString);

                      // mark today
                      const today = new Date();
                      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const isToday = dateString === todayString;

                      days.push(
                        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                          <div className="calendar-day-number">{day}</div>
                          <div className="calendar-day-events">
                            {dayReservations.map((res, idx) => {
                              const statusClass = res.status ? res.status.toLowerCase() : 'pending';
                              return (
                                <div key={idx} className={`calendar-event ${statusClass}`} onClick={() => handleViewReservation(res)}>
                                  <div className="event-title">{res.itemName}</div>
                                  <div className="event-time">{formatReservationTime(res)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return days;
                  })()}
                </div>
              </div>
            ) : displayedReservations.length === 0 ? (
              <div className="empty-state">
                <p>You haven't made any {reservationFilterTab === 'equipment' ? 'equipment' : 'room'} reservations yet.</p>
                <button className="dashboard-btn" onClick={() => setActiveTab(reservationFilterTab === 'equipment' ? 'equipments' : 'rooms')}>Make a Reservation</button>
              </div>
            ) : (
              <div className="reservations-table-container">
                <table className="reservations-table">
                    <thead>
                    <tr>
                    <th>{reservationFilterTab === 'room' ? 'Room Number' : 'Item Name'}</th>
                    {reservationFilterTab === 'equipment' && <th>Item Number</th>}
                    <th>Date Needed</th>
                    <th>Time Needed</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReservations.map(reservation => {
                      // Render room names when viewing room reservations, otherwise derive equipment name/number
                      let itemNameOnly = '';
                      let itemNumber = '-';

                      if (reservationFilterTab === 'room') {
                        const roomId = reservation.equipmentId || reservation.item_id || reservation.itemId || reservation.itemId;
                        if (roomId && roomList && roomList.length > 0) {
                          const foundRoom = roomList.find(r => String(r.id) === String(roomId) || String(r.id) === String(Number(roomId)));
                          if (foundRoom) {
                            itemNameOnly = foundRoom.name || '';
                          }
                        }

                        // Fallbacks
                        if (!itemNameOnly) {
                          if (reservation.itemName) itemNameOnly = reservation.itemName;
                          else if (reservation.name) itemNameOnly = reservation.name;
                          else if (reservation.item_name) itemNameOnly = reservation.item_name;
                        }
                      } else {
                        // equipment
                        const equipId = reservation.equipmentId || reservation.item_id || reservation.itemId || reservation.itemId;
                        if (equipId && equipmentList && equipmentList.length > 0) {
                          const found = equipmentList.find(e => String(e.id) === String(equipId) || String(e.id) === String(Number(equipId)));
                          if (found) {
                            itemNameOnly = found.name || '';
                            itemNumber = found.item_number != null ? String(found.item_number) : '-';
                          }
                        }

                        // Fallbacks if not found above
                        if (!itemNameOnly) {
                          if (reservation.itemName) {
                            // strip trailing " (#123)" if present
                            itemNameOnly = reservation.itemName.replace(/ \(#\d+\)/, '');
                            const match = reservation.itemName.match(/#(\d+)/);
                            if (match) itemNumber = match[1];
                          } else if (reservation.name) {
                            itemNameOnly = reservation.name;
                          } else if (reservation.item_name) {
                            itemNameOnly = reservation.item_name;
                          }
                        }

                        if (itemNumber === '-' && (reservation.item_number || reservation.itemNumber)) {
                          itemNumber = reservation.item_number || reservation.itemNumber;
                        }
                      }

                      return (
                      <tr key={reservation.id}>
                        <td className="item-name">{itemNameOnly}</td>
                        {reservationFilterTab === 'equipment' && <td className="item-number-cell">#{itemNumber}</td>}
                        <td>{reservation.dateNeeded}</td>
                        <td>{formatReservationTime(reservation)}</td>
                        <td className="purpose-cell">{reservation.purpose}</td>
                        <td>
                          <span className={`status-badge status-${reservation.status.toLowerCase()}`}>
                            {reservation.status}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button className="action-btn view-btn" title="View" onClick={() => handleViewReservation(reservation)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                              <path fill="currentColor" d="M12 5c-7 0-11 6-11 7s4 7 11 7 11-6 11-7-4-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z" />
                            </svg>
                          </button>
                          {(() => {
                            const status = (reservation.status || 'pending').toString().toLowerCase();
                            const isApproved = status === 'approved' || status === 'confirmed';
                            if (!isApproved) {
                              return (
                                <>
                                  <button className="action-btn edit-btn" title="Edit" onClick={() => handleEditReservation(reservation)}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
                                    </svg>
                                  </button>
                                  <button className="action-btn delete-btn" title="Delete" onClick={() => handleDeleteClick(reservation)}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                                      <path fill="currentColor" d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                    </svg>
                                  </button>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'equipments':
        // Predefined equipment categories (in preferred order)
        const predefinedCategories = ['SPEAKER', 'MICROPHONE', 'EXTENSION', 'HDMI', 'FLAG', 'TV', 'PROJECTOR'];
        
        // Dynamically generate categories from equipment list
        const categorySet = new Set();
        equipmentList.forEach(eq => {
          if (eq?.name) {
            const cat = getEquipCategory(eq.name);
            if (cat) categorySet.add(cat);
          }
        });
        
        // Separate predefined categories (that are in use) from custom/new categories
        const predefinedInUse = predefinedCategories.filter(cat => categorySet.has(cat));
        const customCategories = Array.from(categorySet)
          .filter(cat => !predefinedCategories.includes(cat))
          .sort();
        
        // Combine: ALL first, then predefined categories, then new categories at the end
        const categories = ['ALL', ...predefinedInUse, ...customCategories];

        const filteredEquipments = selectedCategory === 'ALL'
          ? equipmentList
          : equipmentList.filter(eq => {
              const equipCat = getEquipCategory(eq?.name);
              return equipCat === selectedCategory;
            });

        const toggleEquipment = (equipmentId) => {
          if (selectedEquipments.includes(equipmentId)) {
            setSelectedEquipments(selectedEquipments.filter(id => id !== equipmentId));
          } else {
            setSelectedEquipments([...selectedEquipments, equipmentId]);
          }
        };

        return (
          <div className="dashboard-content" key={activeTab}>
            <h2 className="equipment-title">AVRC Equipments</h2>
            
            <div className="equipment-filter-container">
              <div className="equipment-filters">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`equipment-filter-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className={`equipment-actions ${selectedEquipments.length === 0 ? 'hidden' : ''}`}>
                <button 
                  className="equipment-unselect-btn"
                  onClick={() => setSelectedEquipments([])}
                >
                  Unselect All
                </button>
                <button className="dashboard-btn" onClick={handleProceedToReservation}>Proceed to Reservation</button>
              </div>
            </div>

            <div className="equipment-grid-new">
              {filteredEquipments.map(equipment => (
                <div key={equipment.id} className="equipment-card-new">
                  <input
                    type="checkbox"
                    id={`equipment-${equipment.id}`}
                    checked={selectedEquipments.includes(equipment.id)}
                    onChange={() => toggleEquipment(equipment.id)}
                    className="equipment-checkbox-new"
                    disabled={!isEquipmentAvailable(equipment)}
                  />
                  <div className="equipment-image-placeholder">
                    {equipment.image ? (
                      <img 
                        src={equipment.image} 
                        alt={equipment.name}
                        style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px'}}
                      />
                    ) : (
                      <div style={{fontSize: '0.8rem', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                        No image
                      </div>
                    )}
                  </div>
                  <h3 className="equipment-item-name">{equipment.name}</h3>
                  <div className={`equipment-status ${getEquipmentStatusClass(getEquipmentStatusLabel(equipment))}`}>
                    {getEquipmentStatusLabel(equipment)}
                  </div>
                  <div className="equipment-item-number">Item #{equipment.item_number}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'rooms':
        const toggleRoom = (roomId) => {
          if (selectedRooms.includes(roomId)) {
            setSelectedRooms(selectedRooms.filter(id => id !== roomId));
          } else {
            setSelectedRooms([...selectedRooms, roomId]);
          }
        };

        const viewedRoom = roomList.find(room => room.id === selectedRoomView);

        return (
          <div className="dashboard-content" key={activeTab}>
            <h2 className="equipment-title">AVRC Rooms</h2>

            <div className="rooms-selection-container">
              <div className="rooms-selection-pills">
                {roomList.map(room => (
                  <button
                    key={room.id}
                    className={`room-pill ${selectedRoomView === room.id ? 'active' : ''} ${!room.available ? 'disabled' : ''}`}
                    onClick={() => setSelectedRoomView(room.id)}
                    disabled={!room.available}
                  >
                    {room.name}
                  </button>
                ))}
              </div>

              <div className={`equipment-actions ${selectedRooms.length === 0 ? 'hidden' : ''}`}>
                <button 
                  className="equipment-unselect-btn"
                  onClick={() => setSelectedRooms([])}
                >
                  Unselect All
                </button>
                <button className="dashboard-btn" onClick={handleProceedToRoomReservation}>Proceed to Reservation</button>
              </div>
            </div>

            <div className="equipment-grid-new">
              {viewedRoom && (
                <div key={viewedRoom.id} className="room-card-new">
                  <input
                    type="checkbox"
                    id={`room-${viewedRoom.id}`}
                    checked={selectedRooms.includes(viewedRoom.id)}
                    onChange={() => toggleRoom(viewedRoom.id)}
                    className="room-checkbox-new"
                    disabled={!viewedRoom.available}
                  />
                  <h3 className="room-name">{viewedRoom.name}</h3>
                  <div className="room-image-placeholder" style={{
                    width: '100%',
                    height: '300px',
                    background: '#eee',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {viewedRoom.image ? (
                      <img
                        src={viewedRoom.image}
                        alt={viewedRoom.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '20px'
                        }}
                      />
                    ) : (
                      <span style={{color: '#999', fontSize: '0.9rem'}}>No image</span>
                    )}
                  </div>
                  <div className={`equipment-status ${viewedRoom.available ? 'available' : 'not-available'}`}>
                    {viewedRoom.available ? 'Available' : 'Not Available'}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="userdash-container">
      {/* Navbar */}
      <nav className="userdash-navbar">
        <div className="userdash-nav-content">
          <div 
            className="userdash-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </div>
          {/* Mobile Menu Backdrop and Menu Container */}
          {mobileMenuOpen && (
            <div 
              className="userdash-mobile-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
          )}
          <div className={`userdash-nav-tabs ${mobileMenuOpen ? "show" : ""}`}>
            <div className="userdash-nav-menu-header">
              <button 
                className="userdash-nav-close"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <button 
              className={`userdash-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              DASHBOARD
            </button>
            <button 
              className={`userdash-nav-tab ${activeTab === 'my-reservation' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('my-reservation');
                setMobileMenuOpen(false);
              }}
            >
              MY RESERVATION
            </button>
            <button 
              className={`userdash-nav-tab ${activeTab === 'equipments' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('equipments');
                setMobileMenuOpen(false);
              }}
            >
              EQUIPMENTS
            </button>
            <button 
              className={`userdash-nav-tab ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('rooms');
                setMobileMenuOpen(false);
              }}
            >
              ROOMS
            </button>
          </div>
          <div className="userdash-nav-right">
            <div className="userdash-notifications-menu">
              <button 
                className="btn btn-light userdash-notifications-btn"
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                style={{position: 'relative'}}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C11.45 2 11 2.45 11 3V4C7.13 4.35 4 7.26 4 11C4 14.59 2.89 16.12 2.46 16.8C2.08 17.37 2.15 18.14 2.67 18.67C3.19 19.2 3.96 19.27 4.55 18.88C5.88 18.01 8.05 16 11 16V18C11 18.55 11.45 19 12 19C12.55 19 13 18.55 13 18V16C15.95 16 18.12 18.01 19.45 18.88C20.04 19.27 20.81 19.2 21.33 18.67C21.85 18.14 21.92 17.37 21.54 16.8C21.11 16.12 20 14.59 20 11C20 7.26 16.87 4.35 13 4V3C13 2.45 12.55 2 12 2Z" fill="#333"/>
                </svg>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="userdash-notifications-badge">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {showNotificationsMenu && (
                <div className="userdash-notifications-dropdown">
                  <div className="userdash-notifications-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee'}}>
                    <h3 style={{margin: '0', fontSize: '1rem', fontWeight: '600', color: '#333'}}>Notifications</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          setShowDeleteAllNotifConfirm(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d9534f',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          padding: '4px 8px',
                          textDecoration: 'underline'
                        }}
                        title="Delete all notifications"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="userdash-notifications-list">
                    {notifications.length === 0 ? (
                      <div style={{padding: '24px 16px', textAlign: 'center', color: '#999', fontSize: '0.9rem'}}>
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(notif => {
                        const isApproval = notif.type === 'approval';
                        const isRejection = notif.type === 'rejection';
                        
                        return (
                          <div
                            key={notif.id}
                            className="userdash-notification-item"
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #eee',
                              opacity: notif.read ? 0.6 : 1,
                              background: notif.read ? '#f9f9f9' : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              borderLeft: `3px solid ${isApproval ? '#28a745' : isRejection ? '#dc3545' : '#007bff'}`
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = notif.read ? '#f0f0f0' : '#f9f9f9';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = notif.read ? '#f9f9f9' : '#fff';
                            }}
                            onClick={() => {
                              setShowNotificationsMenu(false);
                              setActiveTab('dashboard');
                            }}
                          >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px'}}>
                              <div style={{flex: 1, minWidth: 0}}>
                                <div style={{fontSize: '0.85rem', fontWeight: '600', color: '#333', marginBottom: '4px'}}>{notif.title}</div>
                                <div style={{fontSize: '0.75rem', color: '#666', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                  {notif.message}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem',
                                  padding: '0',
                                  flexShrink: 0
                                }}
                                title="Delete notification"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 5 && (
                    <div style={{padding: '8px 16px', textAlign: 'center', borderTop: '1px solid #eee'}}>
                      <button
                        onClick={() => {
                          setShowNotificationsMenu(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d9534f',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          padding: '8px'
                        }}
                      >
                        See all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="userdash-profile-menu">
              <button 
                className="btn btn-light userdash-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="13" stroke="#333" strokeWidth="1.8" fill="none"/>
                  <circle cx="14" cy="9.5" r="4" fill="#333"/>
                  <path d="M 6 19.5 Q 6 15.5 14 15.5 Q 22 15.5 22 19.5 Q 22 23 14 23 Q 6 23 6 19.5" fill="#333"/>
                </svg>
              </button>
              {showProfileMenu && (
                <div className="userdash-profile-dropdown">
                  <div className="profile-name-section">
                    <button className="userdash-dropdown-item" onClick={handleViewAccount}>{userName}</button>
                    <button className="edit-profile-btn" onClick={handleViewAccount} title="Edit Account">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <button className="userdash-dropdown-item logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="userdash-main">
        {renderContent()}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-bg">
          <div className="logout-modal">
            <h2 className="logout-modal-title">Confirm Logout</h2>
            <p className="logout-modal-text">Are you sure you want to logout?</p>
            <div className="logout-modal-buttons">
              <button className="logout-modal-btn cancel-btn" onClick={cancelLogout}>
                Cancel
              </button>
              <button className="logout-modal-btn confirm-btn" onClick={confirmLogout}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="account-modal-bg">
          <div className="account-modal">
            <h2 className="account-modal-title">Account Information</h2>
            {showAccountSuccess && (
              <div className="account-success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10b981"/>
                </svg>
                <span>Account information updated successfully!</span>
              </div>
            )}
            <div className="account-form">
              <div className="account-form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={editedInfo.fullname}
                  onChange={(e) => handleAccountChange('fullname', e.target.value)}
                  className="account-input"
                />
              </div>
              <div className="account-form-group">
                <label>Email</label>
                <div className="email-input-wrapper">
                  <input 
                    type="text"
                    value={editedInfo.email.replace('@shc.edu.ph', '')}
                    onChange={(e) => handleAccountChange('email', e.target.value)}
                    className="account-input email-username"
                    placeholder="username"
                  />
                  <span className="email-domain">@shc.edu.ph</span>
                </div>
              </div>
              <div className="account-form-group">
                <label>ID Number</label>
                <input 
                  type="text"
                  value={editedInfo.id_number}
                  onChange={(e) => handleAccountChange('id_number', e.target.value)}
                  className="account-input"
                />
              </div>
              <div className="account-form-group">
                <label>Department</label>
                <input 
                  type="text"
                  value={editedInfo.department}
                  onChange={(e) => handleAccountChange('department', e.target.value)}
                  className="account-input"
                />
              </div>
              <div className="account-form-group">
                <label>Sub/Grade</label>
                <input 
                  type="text"
                  value={editedInfo.sub}
                  onChange={(e) => handleAccountChange('sub', e.target.value)}
                  className="account-input"
                />
              </div>
            </div>
            <div className="account-modal-buttons">
              <button className="account-modal-btn cancel-btn" onClick={handleCancelAccount}>
                Cancel
              </button>
              <button className="account-modal-btn save-btn" onClick={handleSaveAccount}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Form Modal */}
      {showReservationForm && (
        <div className="reservation-modal-bg">
          <div className="reservation-modal">
            <h2 className="reservation-modal-title">Equipment Reservation Form</h2>
            {equipmentReservationError && (
            <div style={{
              backgroundColor: '#fce4ec',
              border: '1px solid #f8bbd0',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink: 0, marginTop: '2px'}}>
                <circle cx="12" cy="12" r="10" stroke="#c2185b" strokeWidth="2"/>
                <path d="M12 7v5" stroke="#c2185b" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#c2185b"/>
              </svg>
              <div style={{fontSize: '0.9rem', color: '#880e4f', lineHeight: '1.5'}}>
                <strong>Equipment reservation must be between 7:30 AM and 5:00 PM on weekdays (Monday-Friday).</strong>
                <div style={{marginTop: '4px'}}>⏸️ Lunch time (12:00 PM - 1:00 PM) is not available for reservations.</div>
              </div>
            </div>
            )}
            {equipmentReservationError && (
              <div className="reservation-error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                  <path d="M12 7v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="17" r="1" fill="#dc2626"/>
                </svg>
                <span>{equipmentReservationError}</span>
              </div>
            )}
            <div className="reservation-form">
              <div className="reservation-form-group">
                <label>Date Needed</label>
                <input 
                  type="date" 
                  value={reservationData.dateNeeded}
                  onChange={(e) => handleReservationChange('dateNeeded', e.target.value)}
                  className="reservation-input"
                  min={getTodayDateString()}
                />
              </div>
              <div className="reservation-form-group">
                <label>Time Needed</label>
                <input 
                  type="time"
                  value={reservationData.timeNeeded}
                  onChange={(e) => handleReservationChange('timeNeeded', e.target.value)}
                  className="reservation-input"
                />
              </div>
              <div className="reservation-form-group">
                <label>Purpose</label>
                <textarea
                  value={reservationData.purpose}
                  onChange={(e) => handleReservationChange('purpose', e.target.value)}
                  className="reservation-textarea"
                  placeholder="Enter the purpose of reservation"
                  rows="4"
                />
              </div>
            </div>
            <div className="reservation-modal-buttons">
              <button className="reservation-modal-btn cancel-btn" onClick={handleCancelReservation}>
                Cancel
              </button>
              <button
                className="reservation-modal-btn submit-btn"
                onClick={handleSubmitReservation}
                disabled={isSubmittingReservation}
              >
                {isSubmittingReservation ? 'Submitting...' : 'Submit Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Success Modal */}
      {showReservationSuccess && (
        <div className="reservation-success-bg">
          <div className="reservation-success-modal">
            <div className="reservation-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
              </svg>
            </div>
            <h3 className="reservation-success-title">Reservation Submitted!</h3>
            <p className="reservation-success-text">Your equipment reservation has been successfully submitted.</p>
          </div>
        </div>
      )}

      {/* View Reservation Modal */}
      {showViewModal && activeReservation && (
        (() => {
          // determine whether this reservation is for equipment or room by looking up lists
          const res = activeReservation;
          const eqId = res.equipmentId || res.item_id || res.itemId;
          const foundEquip = equipmentList && equipmentList.length ? equipmentList.find(e => String(e.id) === String(eqId)) : null;
          const foundRoom = roomList && roomList.length ? roomList.find(r => String(r.id) === String(eqId)) : null;
          const isEquipment = !!foundEquip;
          const title = isEquipment ? (foundEquip.name || res.itemName || `Equipment #${foundEquip?.item_number || ''}`) : (foundRoom ? (foundRoom.name || res.itemName) : (res.itemName || 'Reservation'));
          const imageSrc = isEquipment ? (foundEquip.image || null) : (foundRoom ? (foundRoom.image || null) : null);
          const itemNumber = isEquipment ? (foundEquip.item_number != null ? String(foundEquip.item_number) : (res.item_number || res.itemNumber || '-')) : null;

          return (
            <div className="view-modal-bg">
              <div className="view-modal">
                <h2 className="view-modal-title">{title}</h2>
                <div className="view-modal-image-container">
                  <div className="view-modal-image-placeholder">
                    {imageSrc ? (
                      <img src={imageSrc} alt={title} />
                    ) : (
                      <div style={{color: '#999'}}>No image available</div>
                    )}
                  </div>
                </div>
                <div className="view-modal-details">
                  {isEquipment && <p><strong>Item Number:</strong> #{itemNumber}</p>}
                  <p><strong>Date Needed:</strong> {res.dateNeeded}</p>
                  <p><strong>Time Needed:</strong> {formatReservationTime(res)}</p>
                  <p><strong>Purpose:</strong> {res.purpose}</p>
                  <p><strong>Status:</strong> <span className={`status-badge status-${res.status.toLowerCase()}`}>{res.status}</span></p>
                </div>
                <div className="view-modal-button">
                  <button className="view-modal-close-btn" onClick={() => setShowViewModal(false)}>Close</button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Edit Reservation Modal */}
      {showEditModal && activeReservation && (
        <div className="edit-modal-bg">
          <div className="edit-modal">
            <h2 className="edit-modal-title">Edit Reservation - {activeReservation.itemName}</h2>
            {editModalError && (
              <div className="reservation-error-message" style={{marginBottom: '16px'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                  <path d="M12 7v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="17" r="1" fill="#dc2626"/>
                </svg>
                <span>{editModalError}</span>
              </div>
            )}
            <div className="edit-modal-form">
              <div className="edit-form-group">
                <label>Date Needed</label>
                <input 
                  type="date" 
                  value={editReservationData.dateNeeded}
                  onChange={(e) => setEditReservationData({...editReservationData, dateNeeded: e.target.value})}
                  className="edit-form-input"
                />
              </div>
              <div className="edit-form-group">
                <label>Time Needed</label>
                { (activeReservation && activeReservation.item_type === 'room') ? (
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <input
                      type="time"
                      value={editReservationData.timeFrom}
                      onChange={(e) => setEditReservationData({...editReservationData, timeFrom: e.target.value})}
                      className="edit-form-input"
                    />
                    <span style={{color: '#666', padding: '0 6px'}}>to</span>
                    <input
                      type="time"
                      value={editReservationData.timeTo}
                      onChange={(e) => setEditReservationData({...editReservationData, timeTo: e.target.value})}
                      className="edit-form-input"
                    />
                  </div>
                ) : (
                  <input 
                    type="time"
                    value={editReservationData.timeNeeded}
                    onChange={(e) => setEditReservationData({...editReservationData, timeNeeded: e.target.value})}
                    className="edit-form-input"
                  />
                )}
              </div>
              <div className="edit-form-group">
                <label>Purpose</label>
                <textarea
                  value={editReservationData.purpose}
                  onChange={(e) => setEditReservationData({...editReservationData, purpose: e.target.value})}
                  className="edit-form-textarea"
                  rows="4"
                />
              </div>
            </div>
            <div className="edit-modal-buttons">
              <button className="edit-modal-btn cancel-btn" onClick={() => {setShowEditModal(false); setEditModalError('');}}>Cancel</button>
              <button className="edit-modal-btn save-btn" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && activeReservation && (
        <div className="delete-confirm-bg">
          <div className="delete-confirm-modal">
            <h2 className="delete-confirm-title">Delete Reservation</h2>
            <p className="delete-confirm-text">Are you sure you want to delete your reservation for <strong>{activeReservation.itemName}</strong>?</p>
            <div className="delete-confirm-buttons">
              <button className="delete-confirm-btn cancel-btn" onClick={handleCancelDelete}>Cancel</button>
              <button className="delete-confirm-btn delete-btn" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Notification Confirmation Modal */}
      {showDeleteNotifConfirm && notifToDelete && (
        <div className="delete-confirm-bg">
          <div className="delete-confirm-modal">
            <h2 className="delete-confirm-title">Delete Notification</h2>
            <p className="delete-confirm-text">Are you sure you want to delete this notification?</p>
            <div className="delete-confirm-buttons">
              <button className="delete-confirm-btn cancel-btn" onClick={() => {
                setShowDeleteNotifConfirm(false);
                setNotifToDelete(null);
              }}>Cancel</button>
              <button className="delete-confirm-btn delete-btn" onClick={() => deleteNotification(notifToDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Notifications Confirmation Modal */}
      {showDeleteAllNotifConfirm && (
        <div className="delete-confirm-bg">
          <div className="delete-confirm-modal">
            <h2 className="delete-confirm-title">Delete All Notifications</h2>
            <p className="delete-confirm-text">Are you sure you want to delete all notifications? This cannot be undone.</p>
            <div className="delete-confirm-buttons">
              <button className="delete-confirm-btn cancel-btn" onClick={() => setShowDeleteAllNotifConfirm(false)}>Cancel</button>
              <button className="delete-confirm-btn delete-btn" onClick={() => deleteAllNotifications()}>Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Reservation Form Modal */}
      {showRoomReservationForm && (
        <div className="reservation-modal-bg">
          <div className="reservation-modal">
            <h2 className="reservation-modal-title">Room Reservation Form</h2>
            {roomReservationError && (
            <div style={{
              backgroundColor: '#fce4ec',
              border: '1px solid #f8bbd0',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink: 0, marginTop: '2px'}}>
                <circle cx="12" cy="12" r="10" stroke="#c2185b" strokeWidth="2"/>
                <path d="M12 7v5" stroke="#c2185b" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#c2185b"/>
              </svg>
              <div style={{fontSize: '0.9rem', color: '#880e4f', lineHeight: '1.5'}}>
                <strong>Room reservation must be between 7:30 AM and 5:00 PM on weekdays (Monday-Friday).</strong>
                <div style={{marginTop: '4px'}}>⏸️ Lunch time (12:00 PM - 1:00 PM) is not available for reservations.</div>
              </div>
            </div>
            )}
            {roomReservationError && (
              <div className="reservation-error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                  <path d="M12 7v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="17" r="1" fill="#dc2626"/>
                </svg>
                <span>{roomReservationError}</span>
              </div>
            )}
            <div className="reservation-form">
              <div className="reservation-form-group">
                <label>Date Needed</label>
                <input 
                  type="date" 
                  value={roomReservationData.dateNeeded}
                  onChange={(e) => handleRoomReservationChange('dateNeeded', e.target.value)}
                  className="reservation-input"
                  min={getTodayDateString()}
                />
              </div>
              <div className="reservation-form-group">
                <label>Time Needed</label>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <input
                    type="time"
                    value={roomReservationData.timeFrom}
                    onChange={(e) => handleRoomReservationChange('timeFrom', e.target.value)}
                    className="reservation-input"
                    aria-label="Start time"
                    disabled={roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded)}
                    style={{
                      opacity: roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded) ? 0.5 : 1,
                      cursor: roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded) ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <span style={{color: '#666', padding: '0 6px'}}>to</span>
                  <input
                    type="time"
                    value={roomReservationData.timeTo}
                    onChange={(e) => handleRoomReservationChange('timeTo', e.target.value)}
                    className="reservation-input"
                    aria-label="End time"
                    disabled={roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded)}
                    style={{
                      opacity: roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded) ? 0.5 : 1,
                      cursor: roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded) ? 'not-allowed' : 'pointer'
                    }}
                  />
                </div>
                {roomReservationData.timeFrom && roomReservationData.timeTo && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#1976d2',
                    fontWeight: '500'
                  }}>
                    Selected time: {formatTimeWithAMPM(roomReservationData.timeFrom)} to {formatTimeWithAMPM(roomReservationData.timeTo)}
                  </div>
                )}
              </div>

              {/* Show reserved slots or Sunday closed message */}
              {roomReservationData.dateNeeded && selectedRoomsList.length > 0 && (
                <div className="reservation-form-group">
                  <label>Availability on {new Date(roomReservationData.dateNeeded).toLocaleDateString()}</label>
                  {isSunday(roomReservationData.dateNeeded) ? (
                    <div style={{
                      backgroundColor: '#fee2e2',
                      border: '2px solid #dc2626',
                      borderRadius: '4px',
                      padding: '12px',
                      fontSize: '14px',
                      color: '#991b1b',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{fontSize: '18px'}}>🔴</span>
                      <span>Office is CLOSED on Sundays. Please select a different date.</span>
                    </div>
                  ) : loadingAvailability ? (
                    <div style={{fontSize: '14px', color: '#666'}}>Loading availability...</div>
                  ) : reservedSlots.length > 0 ? (
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '12px',
                      fontSize: '14px'
                    }}>
                      <p style={{margin: '0 0 8px 0', fontWeight: '500', color: '#374151'}}>Already booked:</p>
                      {reservedSlots.map((slot, idx) => (
                        <div key={idx} style={{color: '#ef4444', marginBottom: '4px', paddingLeft: '8px'}}>
                          • {formatTimeWithAMPM(slot.start)} to {formatTimeWithAMPM(slot.end)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbefc2',
                      borderRadius: '4px',
                      padding: '12px',
                      fontSize: '14px',
                      color: '#16a34a'
                    }}>
                      ✓ This room is available throughout the day
                    </div>
                  )}
                </div>
              )}
              <div className="reservation-form-group">
                <label>Purpose</label>
                <textarea
                  value={roomReservationData.purpose}
                  onChange={(e) => handleRoomReservationChange('purpose', e.target.value)}
                  className="reservation-textarea"
                  placeholder="Enter the purpose of reservation"
                  rows="4"
                />
              </div>
            </div>
            <div className="reservation-modal-buttons">
              <button className="reservation-modal-btn cancel-btn" onClick={handleCancelRoomReservation}>
                Cancel
              </button>
              <button 
                className="reservation-modal-btn submit-btn" 
                onClick={handleSubmitRoomReservation}
                disabled={roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded)}
                style={{
                  opacity: roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded) ? 0.5 : 1,
                  cursor: roomReservationData.dateNeeded && isSunday(roomReservationData.dateNeeded) ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Reservation Success Modal */}
      {showRoomReservationSuccess && (
        <div className="reservation-success-bg">
          <div className="reservation-success-modal">
            <div className="reservation-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
              </svg>
            </div>
            <h3 className="reservation-success-title">Reservation Submitted!</h3>
            <p className="reservation-success-text">Your room reservation has been successfully submitted.</p>
          </div>
        </div>
      )}

      {/* Chatbot Backdrop Overlay */}
      {showChatbot && (
        <div className="chatbot-backdrop" onClick={() => setShowChatbot(false)}></div>
      )}

      {/* NLP Chatbot Widget */}
      <div className="chatbot-widget">
        <button 
          className="chatbot-toggle-btn"
          onClick={() => setShowChatbot(!showChatbot)}
          title="AVRC Assistant"
        >
          💬
        </button>
        
        {showChatbot && (
          <div className="chatbot-window">
            <div className="chatbot-header">
              <h3>AVRC Assistant</h3>
              <button 
                className="chatbot-close-btn"
                onClick={() => setShowChatbot(false)}
              >
                ×
              </button>
            </div>
            
            <div className="chatbot-messages">
              {chatMessages.map(msg => (
                <div key={msg.id}>
                  <div className={`chat-message ${msg.sender} ${msg.id === 1 ? 'welcome-message' : ''}`}>
                    <div className={`chat-bubble ${msg.id === 1 ? 'welcome-bubble' : ''}`}>
                      {msg.text}
                    </div>
                  </div>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="chat-suggestions">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          className="suggestion-btn"
                          onClick={() => handleQuickAction(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            
            <div className="chatbot-input-area">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask me anything..."
                className="chatbot-input"
              />
              <button 
                onClick={handleChatSend}
                className="chatbot-send-btn"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
