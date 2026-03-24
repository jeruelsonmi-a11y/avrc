import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import '../styles/AdminDashboard.css';
import '../styles/RegistrationForm.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { API_BASE_URL, WS_BASE_URL } from '../config';

// Predefined item names
const ITEM_NAMES = [
  'Speaker',
  'Microphone',
  'Extension Cord',
  'HDMI Cable',
  'Flag',
  'TV',
  'Projector',
  'Other (Custom)'
];

// Map equipment names to their categories
const getEquipmentCategory = (name) => {
  const categoryMap = {
    'Speaker': 'SPEAKER',
    'Microphone': 'MICROPHONE',
    'Extension Cord': 'EXTENSION',
    'HDMI Cable': 'HDMI',
    'Flag': 'FLAG',
    'TV': 'TV',
    'Projector': 'PROJECTOR'
  };
  return categoryMap[name] || name.toUpperCase();
};

const formatApiError = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error
      .map(item => {
        if (typeof item === 'string') return item;
        if (!item) return '';
        if (item.msg) return item.msg;
        if (item.detail) return formatApiError(item.detail);
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof error === 'object') {
    if (error.detail) return formatApiError(error.detail);
    if (error.msg) return error.msg;
    return Object.values(error)
      .map(value => formatApiError(value))
      .filter(Boolean)
      .join('; ');
  }
  return String(error);
};

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  // Handle time range format: "14:00 - 15:00"
  if (time24.includes(' - ')) {
    const [startTime, endTime] = time24.split(' - ');
    return `${formatSingleTime(startTime.trim())} - ${formatSingleTime(endTime.trim())}`;
  }
  // Single time format: "14:00"
  return formatSingleTime(time24);
};

const formatSingleTime = (time24) => {
  if (!time24) return '';
  // time24 format: "14:00" or "14:00:00" or "14" or "15"
  const parts = time24.split(':');
  const hour = parseInt(parts[0], 10);
  const minutes = parts[1] ? parts[1] : '00';
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${meridiem}`;
};

const EQUIPMENT_STATUS_OPTIONS = [
  'Available',
  'Not Available',
  'Under Maintenance',
  'For Repair'
];

function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminName, setAdminName] = useState('Admin');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [userDepartmentTab, setUserDepartmentTab] = useState('ALL');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  // user management state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserError, setEditUserError] = useState('');
  const [editUserData, setEditUserData] = useState({
    id: null,
    fullname: '',
    email: '',
    id_number: '',
    department: '',
    sub: ''
  });
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deleteUserError, setDeleteUserError] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [addUserData, setAddUserData] = useState({
    fullname: '',
    email: '',
    id_number: '',
    department: '',
    sub: '',
    password: '',
    confirmPassword: ''
  });
  const [equipment, setEquipment] = useState([]);
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const equipmentTypes = useMemo(() => {
    return Array.from(new Set(equipment.map(e => e.name).filter(Boolean))).sort();
  }, [equipment]);
  const [dynamicItemNames, setDynamicItemNames] = useState([]);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showEditEquipmentModal, setShowEditEquipmentModal] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState(null);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    customName: '',
    item_number: '',
    status: 'Available',
    image: null,
    imagePreview: null
  });
  const [editEquipmentData, setEditEquipmentData] = useState({
    id: null,
    name: '',
    customName: '',
    item_number: '',
    status: 'Available',
    available: true,
    image: null,
    imagePreview: null
  });

  // room management state
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reservationsFilter, setReservationsFilter] = useState('equipment');
  const [equipmentReturns, setEquipmentReturns] = useState([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [newRoom, setNewRoom] = useState({
    name: '',
    image: null,
    imagePreview: null
  });
  const [editRoomData, setEditRoomData] = useState({
    id: null,
    name: '',
    available: true,
    image: null,
    imagePreview: null
  });
  const [addRoomSuccess, setAddRoomSuccess] = useState(false);
  const [updateRoomSuccess, setUpdateRoomSuccess] = useState(false);
  const [addEquipmentSuccess, setAddEquipmentSuccess] = useState(false);
  const [updateEquipmentSuccess, setUpdateEquipmentSuccess] = useState(false);
  const [stats, setStats] = useState({
    total_users: 0,
    total_equipment: 0,
    total_rooms: 0,
    pending_reservations: 0
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewReservation, setViewReservation] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReservationId, setRejectReservationId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSuccessMsg, setRejectSuccessMsg] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveReservationId, setApproveReservationId] = useState(null);
  const [approveSuccessMsg, setApproveSuccessMsg] = useState('');
  const [approverName, setApproverName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReservationId, setDeleteReservationId] = useState(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');
  const [showEditReservationModal, setShowEditReservationModal] = useState(false);
  const [editReservationData, setEditReservationData] = useState({
    id: null,
    date_needed: '',
    time_from: '',
    time_to: '',
    purpose: '',
    item_type: ''
  });
  const [editReservationError, setEditReservationError] = useState('');

  // Equipment return state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReservationId, setReturnReservationId] = useState(null);
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnSuccessMessage, setReturnSuccessMessage] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [recentReturns, setRecentReturns] = useState(() => {
    const saved = localStorage.getItem('recentReturns');
    return saved ? JSON.parse(saved) : [];
  });

  // Inventory management state
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('All');
  const [inventoryEquipmentNameFilter, setInventoryEquipmentNameFilter] = useState('All');
  const [selectedInventoryItems, setSelectedInventoryItems] = useState(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState('Available');
  const [showInventoryTable, setShowInventoryTable] = useState(false);

  // Recent Returns search and filter state
  const [returnsSearchTerm, setReturnsSearchTerm] = useState('');
  const [returnsDateFilter, setReturnsDateFilter] = useState('');
  const [returnsDepartmentFilter, setReturnsDepartmentFilter] = useState('All');
  const [returnsConditionFilter, setReturnsConditionFilter] = useState('All');
  const [showAllReturns, setShowAllReturns] = useState(false);

  // Equipment Returns by Condition filter state
  const [returnsConditionMonth, setReturnsConditionMonth] = useState(new Date().getMonth()); // 0-11
  const [returnsConditionYear, setReturnsConditionYear] = useState(new Date().getFullYear());

  // Most Active Departments filter state
  const [activeDeptMonth, setActiveDeptMonth] = useState(new Date().getMonth()); // 0-11
  const [activeDeptYear, setActiveDeptYear] = useState(new Date().getFullYear());

  // Responsive chart sizing
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive chart width
  const getChartWidth = (maxWidth = 750) => {
    const containerPadding = 40;
    const availableWidth = windowWidth - containerPadding;
    return Math.min(availableWidth, maxWidth);
  };

  // Predictive Analytics state
  const [peakUsageData, setPeakUsageData] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);
  const [equipmentUsageFilter, setEquipmentUsageFilter] = useState('week'); // 'week', 'month', 'year'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [equipmentHealth, setEquipmentHealth] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const fetchPredictiveAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch peak usage data
      const peakRes = await fetch(`${API_BASE_URL}/analytics/peak-usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (peakRes.ok) {
        setPeakUsageData(await peakRes.json());
      }

      // Fetch demand forecast
      const forecastRes = await fetch(`${API_BASE_URL}/analytics/demand-forecast`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (forecastRes.ok) {
        setDemandForecast(await forecastRes.json());
      }

      // Fetch equipment health data
      const healthRes = await fetch(`${API_BASE_URL}/analytics/equipment-health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (healthRes.ok) {
        setEquipmentHealth(await healthRes.json());
      }

      // Fetch recommendations
      const recsRes = await fetch(`${API_BASE_URL}/analytics/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recsRes.ok) {
        setRecommendations((await recsRes.json()).recommendations || []);
      }
    } catch (err) {
      console.error('Error fetching predictive analytics:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        // Update stats with actual user count
        setStats(prev => ({
          ...prev,
          total_users: data.length
        }));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  const filteredUsers = (userDepartmentTab === 'ALL' 
    ? users 
    : users.filter(user => user.department === userDepartmentTab)).filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.fullname?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.id_number?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower)
    );
  });

  const handleEditUser = (user) => {
    setEditUserError('');
    setEditUserData({
      id: user.id,
      fullname: user.fullname || '',
      email: user.email || '',
      id_number: user.id_number || '',
      department: user.department || '',
      sub: user.sub || ''
    });
    setShowEditUserModal(true);
  };

  const handleSaveEditUser = async () => {
    if (!editUserData.id) return;

    const fullname = (editUserData.fullname || '').trim();
    const email = (editUserData.email || '').trim();
    const idNumber = (editUserData.id_number || '').trim();
    const department = (editUserData.department || '').trim();
    const sub = (editUserData.sub || '').trim();

    if (!fullname || !email || !idNumber || !department) {
      setEditUserError('Please fill in Full Name, Email, ID Number, and Department.');
      return;
    }

    setEditUserError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${editUserData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          fullname,
          email,
          id_number: idNumber,
          department,
          sub
        })
      });

      if (res.ok) {
        setShowEditUserModal(false);
        setEditUserError('');
        setUserSuccessMsg('User updated successfully!');
        setTimeout(() => setUserSuccessMsg(''), 3500);
        await fetchUsers();
      } else {
        const errText = await res.text();
        setEditUserError(errText || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setEditUserError('Error updating user');
    }
  };

  const handleAddUser = async () => {
    // Validate required fields
    const fullname = (addUserData.fullname || '').trim();
    const email = (addUserData.email || '').trim();
    const idNumber = (addUserData.id_number || '').trim();
    const department = (addUserData.department || '').trim();
    const password = (addUserData.password || '').trim();
    const confirmPassword = (addUserData.confirmPassword || '').trim();
    const sub = (addUserData.sub || '').trim();

    if (!fullname || !email || !idNumber || !department || !password || !confirmPassword) {
      setAddUserError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setAddUserError('Passwords do not match.');
      return;
    }

    if (!email.endsWith('@shc.edu.ph')) {
      setAddUserError('Email must end with @shc.edu.ph');
      return;
    }

    if (department === 'BED' && !sub) {
      setAddUserError('Please select a Grade Level for BED.');
      return;
    }

    if (department === 'HED' && !sub) {
      setAddUserError('Please select a Course for HED.');
      return;
    }

    setAddUserError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          fullname,
          email,
          id_number: idNumber,
          department,
          sub,
          password
        })
      });

      if (res.ok) {
        setAddUserSuccess(true);
        setUserSuccessMsg('User added successfully!');
        setTimeout(() => setUserSuccessMsg(''), 3500);
        setAddUserData({
          fullname: '',
          email: '',
          id_number: '',
          department: '',
          sub: '',
          password: '',
          confirmPassword: ''
        });
        setTimeout(() => setShowAddUserModal(false), 800);
        await fetchUsers();
      } else {
        const errData = await res.json();
        const formatted = formatApiError(errData.detail || errData);
        setAddUserError(formatted || 'Failed to add user');
      }
    } catch (err) {
      console.error('Error adding user:', err);
      setAddUserError('Error adding user');
    }
  };

  const handleDeleteUser = (user) => {
    setDeleteUserError('');
    setDeleteUserId(user?.id ?? null);
    setDeleteUserName(user?.fullname ?? '');
    setShowDeleteUserModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserId) return;

    const url = `${API_BASE_URL}/auth/user/${deleteUserId}`;
      console.debug('Deleting user:', deleteUserId, deleteUserName ? `(${deleteUserName})` : '', 'URL:', url);

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (res.ok) {
        setShowDeleteUserModal(false);
        setDeleteUserId(null);
        setDeleteUserName('');
        setDeleteUserError('');
        setUserSuccessMsg('User deleted successfully!');
        setTimeout(() => setUserSuccessMsg(''), 3500);
        await fetchUsers();
      } else {
        const contentType = res.headers.get('Content-Type') || '';
        let message = `Failed to delete user (status ${res.status})`;
        try {
          if (contentType.includes('application/json')) {
            const data = await res.json();
            message = data.detail || JSON.stringify(data);
          } else {
            const text = await res.text();
            if (text) message = text;
          }
        } catch (parseErr) {
          console.warn('Failed to parse delete response:', parseErr);
        }
        console.warn('Delete user failed', res.status, message);
        setDeleteUserError(message);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setDeleteUserError(`Error deleting user: ${err.message || err}`);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTimeWithAMPM = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to calculate equipment usage based on returns data and time filter
  const getEquipmentUsageData = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(equipmentUsageFilter) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        // Use selected month
        startDate = new Date(selectedYear, selectedMonth, 1);
        break;
      case 'year':
        // Use selected year
        startDate = new Date(selectedYear, 0, 1);
        break;
      default:
        startDate = new Date(0); // epoch
    }

    const equipmentCount = {};
    
    // Count actual equipment returns in the date range
    equipmentReturns.forEach(ret => {
      const equipmentName = ret.equipmentName || ret.equipment_name || 'Unknown';
      const returnDateStr = ret.return_date || (ret.returnDateTime ? ret.returnDateTime.split('T')[0] : '');
      
      if (returnDateStr) {
        const retDate = new Date(returnDateStr + 'T00:00:00');
        if (equipmentUsageFilter === 'month') {
          // Check if in same month and year
          if (retDate.getMonth() === selectedMonth && retDate.getFullYear() === selectedYear) {
            equipmentCount[equipmentName] = (equipmentCount[equipmentName] || 0) + 1;
          }
        } else if (equipmentUsageFilter === 'year') {
          // Check if in same year
          if (retDate.getFullYear() === selectedYear) {
            equipmentCount[equipmentName] = (equipmentCount[equipmentName] || 0) + 1;
          }
        } else {
          // For week, use start date comparison (past 7 days + current + next 7 days)
          let endDate = new Date();
          endDate.setDate(now.getDate() + 7);
          if (retDate >= startDate && retDate <= endDate) {
            equipmentCount[equipmentName] = (equipmentCount[equipmentName] || 0) + 1;
          }
        }
      }
    });

    // Convert to array and sort by count
    const data = Object.entries(equipmentCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    return data;
  };

  const getEquipmentStatusLabel = (item) => {
    if (item && item.status) return item.status;
    return item && item.available ? 'Available' : 'Not Available';
  };

  const getEquipmentStatusStyles = (label) => {
    const key = label.toLowerCase();
    if (key === 'available') {
      return { backgroundColor: '#d4edda', color: '#155724' };
    }
    if (key === 'under maintenance') {
      return { backgroundColor: '#fff3cd', color: '#856404' };
    }
    if (key === 'for repair') {
      return { backgroundColor: '#ffe8cc', color: '#8a4b08' };
    }
    return { backgroundColor: '#f8d7da', color: '#721c24' };
  };

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEquipment(data);
        // Extract unique equipment names from database and add them to dropdown options
        const uniqueNames = new Set();
        data.forEach(eq => {
          if (eq.name && !ITEM_NAMES.includes(eq.name)) {
            uniqueNames.add(eq.name);
          }
        });
        setDynamicItemNames(Array.from(uniqueNames).sort());
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('DEBUG - Fetching reservations with token:', token ? 'present' : 'missing');
      
      const res = await fetch(`${API_BASE_URL}/reservations/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('DEBUG - Reservations API response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('DEBUG - Fetched reservations:', data);
        console.log('DEBUG - Number of reservations:', data.length);
        setReservations(data);
        const pendingCount = data.filter(r => (r.status || '').toString().toLowerCase() === 'pending').length;
        setStats(prev => ({
          ...prev,
          pending_reservations: pendingCount
        }));
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch reservations, status:', res.status, 'response:', errorText);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  }, []);

  const fetchEquipmentReturns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment-returns/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Transform database records to match frontend format
        const transformedReturns = data.map(ret => {
          // Find equipment item to get item_number and name
          const equipItem = equipment.find(e => String(e.id) === String(ret.equipment_id));
          
          // Use data from API response directly - it already has username, department, id_number
          const userName = ret.username || 'Unknown User';
          const departmentName = ret.department || 'NTP';
          const idNumberValue = ret.id_number || '';
          
          return {
            id: ret.id,
            userName: userName,
            equipmentId: ret.equipment_id,
            equipmentName: equipItem?.name || ret.equipment_name || '',
            itemNumber: equipItem?.item_number || ret.item_number || '',
            condition: ret.condition,
            conditionLabel: ret.condition === 'good' ? 'Good Condition' : ret.condition === 'damaged' ? 'Damaged' : 'Maintenance Needed',
            remarks: ret.remarks,
            priority: ret.priority,
            newStatus: ret.new_status,
            department: departmentName,
            idNumber: idNumberValue,
            return_date: ret.created_at ? ret.created_at.split('T')[0] : '',
            returnDate: new Date(ret.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            returnTime: new Date(ret.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
            returnDateTime: ret.created_at
          };
        });
        setRecentReturns(transformedReturns);
        setEquipmentReturns(transformedReturns);
      }
    } catch (err) {
      console.error('Error fetching equipment returns:', err);
      // Fall back to localStorage if API fails
      const saved = localStorage.getItem('recentReturns');
      if (saved) {
        setRecentReturns(JSON.parse(saved));
      }
    }
  }, [equipment]);

  const awaitFetchForReservations = useCallback(async () => {
    // load equipment, rooms, users, then reservations
    await fetchEquipment();
    await fetchRooms();
    await fetchUsers();
    await fetchReservations();
      await fetchEquipmentReturns();
    }, [fetchEquipment, fetchRooms, fetchUsers, fetchReservations, fetchEquipmentReturns]);
  // Track if we've initialized on mount
  const initRef = useRef(false);

  // Single initialization effect - runs ONLY on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (initRef.current) return; // Already initialized
    initRef.current = true;

    // Get admin name from localStorage
    const name = localStorage.getItem('user_fullname');
    if (name) {
      setAdminName(name);
    }
    // Fetch stats
    fetchStats();
    // Preload reservations and equipment so the navbar badge is visible on dashboard
    const initLoad = async () => {
      await awaitFetchForReservations();
      await fetchEquipmentReturns();
    };
    initLoad();
  }, [awaitFetchForReservations, fetchEquipmentReturns, fetchStats]);

  // Tab-specific data loading - only depends on activeTab
  useEffect(() => {
    (async () => {
      // Fetch users when users tab is active
      if (activeTab === 'users') {
        await fetchUsers();
      }
      // Fetch equipment when equipment tab is active
      if (activeTab === 'equipment') {
        await fetchEquipment();
      }
      // Fetch rooms when rooms tab is active
      if (activeTab === 'rooms') {
        await fetchRooms();
      }
      // Fetch inventory (which includes recent returns) when inventory tab is active
      if (activeTab === 'inventory') {
        await fetchEquipment();
        await fetchEquipmentReturns();
      }
      // Fetch reservations when reservations tab is active
      if (activeTab === 'reservations') {
        // ensure lists are loaded so we can join names
        await awaitFetchForReservations();
      }
      // Fetch analytics when analytics tab is active
      if (activeTab === 'analytics') {
        await fetchPredictiveAnalytics();
      }
    })();
  }, [activeTab, awaitFetchForReservations, fetchEquipment, fetchEquipmentReturns, fetchPredictiveAnalytics, fetchRooms, fetchUsers])

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

  // Save recent returns to localStorage
  useEffect(() => {
    localStorage.setItem('recentReturns', JSON.stringify(recentReturns));
  }, [recentReturns]);

  // Real-time WebSocket updates for reservations and equipment returns
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let ws = null;
    let pingTimer = null;
    let reconnectTimeout = null;
    let isManuallyClosing = false;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);

        ws.onopen = () => {
          console.log('[AdminDashboard WebSocket] Connected');
          // Keep-alive ping
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

            // Refresh reservations when any reservation event occurs
            if (t.startsWith('reservation.') || t.startsWith('equipment_return.')) {
              console.log('[AdminDashboard WebSocket] Received:', t);
              awaitFetchForReservations();
            }

            // Refresh rooms when any room event occurs
            if (t.startsWith('room.')) {
              console.log('[AdminDashboard WebSocket] Received:', t);
              fetchRooms();
            }

            // Refresh equipment when any equipment event occurs
            if (t.startsWith('equipment.')) {
              console.log('[AdminDashboard WebSocket] Received:', t);
              fetchEquipment();
            }
          } catch (e) {
            // ignore malformed messages
          }
        };

        ws.onerror = (error) => {
          console.error('[AdminDashboard WebSocket] Error:', error);
        };

        ws.onclose = () => {
          console.log('[AdminDashboard WebSocket] Disconnected');
          if (pingTimer) window.clearInterval(pingTimer);
          
          // Auto-reconnect after 5 seconds unless manually closing
          if (!isManuallyClosing) {
            reconnectTimeout = window.setTimeout(() => {
              console.log('[AdminDashboard WebSocket] Attempting to reconnect...');
              connectWebSocket();
            }, 5000);
          }
        };
      } catch (e) {
        console.error('[AdminDashboard WebSocket] Connection error:', e);
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

  // Real-time polling fallback: refresh reservations and rooms every 1 second
  useEffect(() => {
    const pollInterval = window.setInterval(async () => {
      try {
        await awaitFetchForReservations();
        await fetchEquipmentReturns();
        await fetchRooms();
        await fetchEquipment();
      } catch (err) {
        console.error('[AdminDashboard] Error during polling update:', err);
      }
    }, 1000); // 1 second

    return () => {
      if (pollInterval) window.clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApproveReservation = async (reservationId) => {
    const r = reservations.find(x => x.id === reservationId);
    if (!r) return;
    const payload = {
      item_type: r.item_type,
      item_id: r.item_id,
      date_needed: r.date_needed,
      time_from: r.time_from,
      time_to: r.time_to,
      purpose: r.purpose,
      status: 'approved',
      user_id: r.user_id,
      approved_by_name: approverName
    };
    try {
      const res = await fetch(`${API_BASE_URL}/reservations/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedReservation = await res.json();
        
        // Create notification for the user
        try {
          const reservation = reservations.find(x => x.id === reservationId);
          if (reservation && reservation.user_id) {
            // Get item name with number - always look up from equipment/rooms arrays
            let itemDisplay = 'item';
            if (reservation.item_type === 'equipment') {
              const eq = equipment.find(e => String(e.id) === String(reservation.item_id));
              if (eq) {
                itemDisplay = `${eq.name} (#${eq.item_number})`;
              }
            } else if (reservation.item_type === 'room') {
              const room = rooms.find(r => String(r.id) === String(reservation.item_id));
              if (room) {
                itemDisplay = room.name;
              }
            }
            await fetch(`${API_BASE_URL}/notifications/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              },
              body: JSON.stringify({
                user_id: reservation.user_id,
                title: 'Reservation Approved',
                message: `Your reservation for ${itemDisplay} on ${reservation.date_needed} has been approved!`,
                type: 'approval',
                reservation_id: reservationId
              })
            });
          }
        } catch (err) {
          console.warn('Failed to create notification:', err);
        }
        
        // update the reservation status locally and keep it in the list with the server response data
        setReservations(prev => {
          const updated = prev.map(x => x.id === reservationId ? { 
            ...x, 
            status: 'approved', 
            approved_by_name: updatedReservation.approved_by_name || approverName,
            approved_by_id: updatedReservation.approved_by_id,
            approved_at: updatedReservation.approved_at
          } : x);
          // sort so pending reservations come first
          const pending = updated.filter(r => (r.status || '').toString().toLowerCase() === 'pending');
          const others = updated.filter(r => (r.status || '').toString().toLowerCase() !== 'pending');
          return [...pending, ...others];
        });
        // refresh other data (stats, equipment)
        await fetchStats();
        await fetchEquipment();
        // show approval success banner briefly
        setApproveSuccessMsg('Reservation approved successfully');
        setTimeout(() => setApproveSuccessMsg(''), 3500);
      } else {
        console.error('Failed to approve reservation');
        alert('Failed to approve reservation');
      }
    } catch (err) {
      console.error(err);
      alert('Error approving reservation');
    }
  };

  const openRejectModal = (reservationId) => {
    setRejectReservationId(reservationId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmDeleteReservation = async () => {
    if (!deleteReservationId) return;
    const target = reservations.find(r => r.id === deleteReservationId);
    
    try {
      // Delete the reservation from the backend
      const delRes = await fetch(`${API_BASE_URL}/reservations/${deleteReservationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!delRes.ok) {
        console.error('Failed to delete reservation', delRes.status);
        alert('Failed to delete reservation');
        return;
      }

      // If this was an equipment reservation, mark the equipment as available
      if (target && target.item_type === 'equipment') {
        const eq = equipment.find(e => String(e.id) === String(target.item_id));
        if (eq) {
          try {
            await fetch(`${API_BASE_URL}/equipment/${eq.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              },
              body: JSON.stringify({
                name: eq.name,
                item_number: eq.item_number || eq.itemNumber || '',
                available: true,
                image: eq.image || null
              })
            });
          } catch (err) {
            console.warn('Failed to mark equipment available', err);
          }
        }
      }

      // Refresh UI
      await fetchReservations();
      await fetchEquipment();
      await fetchStats();

      setShowDeleteModal(false);
      setDeleteReservationId(null);

      // Show delete success banner briefly
      setDeleteSuccessMsg('Reservation deleted successfully');
      setTimeout(() => setDeleteSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error deleting reservation:', err);
      alert('Error deleting reservation');
    }
  };

  const confirmRejectReservation = async () => {
    if (!rejectReservationId) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    const target = reservations.find(r => r.id === rejectReservationId);
    
    // Close modal IMMEDIATELY without waiting for API calls
    setShowRejectModal(false);
    setRejectReservationId(null);
    setRejectReason('');

    // Show rejection success banner immediately
    setRejectSuccessMsg('Reservation rejected successfully');
    setTimeout(() => setRejectSuccessMsg(''), 3500);

    // Perform all API operations in parallel in the background (fire and forget)
    // Don't await these - WebSocket will update the UI automatically
    try {
      const payload = {
        item_type: target.item_type,
        item_id: target.item_id,
        date_needed: target.date_needed,
        time_from: target.time_from,
        time_to: target.time_to,
        purpose: target.purpose,
        status: 'denied',
        user_id: target.user_id,
        rejection_reason: rejectReason.trim()
      };

      // Deny the reservation - don't await
      fetch(`${API_BASE_URL}/reservations/${rejectReservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('Failed to deny reservation:', err));

      // Create notification for the user about rejection - don't await
      if (target && target.user_id) {
        // Get item name with number - always look up from equipment/rooms arrays
        let itemDisplay = 'item';
        if (target.item_type === 'equipment') {
          const eq = equipment.find(e => String(e.id) === String(target.item_id));
          if (eq) {
            itemDisplay = `${eq.name} (#${eq.item_number})`;
          }
        } else if (target.item_type === 'room') {
          const room = rooms.find(r => String(r.id) === String(target.item_id));
          if (room) {
            itemDisplay = room.name;
          }
        }
        fetch(`${API_BASE_URL}/notifications/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            user_id: target.user_id,
            title: 'Reservation Rejected',
            message: `Your reservation for ${itemDisplay} on ${target.date_needed} was rejected. Reason: ${rejectReason.trim()}`,
            type: 'rejection',
            reservation_id: rejectReservationId
          })
        }).catch(err => console.warn('Failed to create notification:', err));
      }

      // Attempt to delete the reservation from the backend - don't await
      fetch(`${API_BASE_URL}/reservations/${rejectReservationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      }).catch(err => console.warn('Error deleting reservation after denial:', err));

      // If this was an equipment reservation, mark the equipment as available - don't await
      if (target && target.item_type === 'equipment') {
        const eq = equipment.find(e => String(e.id) === String(target.item_id));
        if (eq) {
          fetch(`${API_BASE_URL}/equipment/${eq.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              name: eq.name,
              item_number: eq.item_number || eq.itemNumber || '',
              available: true,
              image: eq.image || null
            })
          }).catch(err => console.warn('Failed to mark equipment available:', err));
        }
      }
    } catch (err) {
      console.error('Error processing rejection:', err);
    }
  };

  const handleEquipmentReturn = async () => {
    if (!returnReservationId) return;
    const reservation = reservations.find(r => r.id === returnReservationId);
    if (!reservation || reservation.item_type !== 'equipment') {
      alert('Invalid equipment reservation');
      return;
    }

    const equipmentItem = equipment.find(e => String(e.id) === String(reservation.item_id));
    if (!equipmentItem) {
      alert('Equipment not found');
      console.log('DEBUG: Could not find equipment. Reservation:', reservation);
      console.log('DEBUG: Equipment list:', equipment);
      return;
    }
    console.log('DEBUG: Found equipment item:', equipmentItem);

    // Save variables for background processing
    const currentReturnCondition = returnCondition;
    const currentReturnRemarks = returnRemarks;
    const currentReturnReservationId = returnReservationId;

    // Close modal immediately
    setShowReturnModal(false);
    setReturnReservationId(null);
    setReturnCondition('good');
    setReturnRemarks('');
    setReturnLoading(true);

    // Run the async operations in the background without blocking UI
    (async () => {
      try {
        // Determine new equipment status based on condition
        let newEquipmentStatus = 'Available';
        if (currentReturnCondition === 'damaged') {
          newEquipmentStatus = 'For Repair';
        } else if (currentReturnCondition === 'maintenance') {
          newEquipmentStatus = 'Under Maintenance';
        }

        // Step 1: Update equipment status in inventory
        console.log('Step 1: Updating equipment status...');
        const updatePayload = {
          name: equipmentItem.name,
          item_number: equipmentItem.item_number || equipmentItem.itemNumber || '',
          status: newEquipmentStatus,
          available: newEquipmentStatus === 'Available',
          image: equipmentItem.image || null
        };
        console.log('Equipment update payload:', updatePayload);
        console.log('Equipment ID:', equipmentItem.id);
        
        const equipRes = await fetch(`${API_BASE_URL}/equipment/${equipmentItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(updatePayload)
        });

        console.log('Equipment update response status:', equipRes.status);
        const equipResData = await equipRes.json();
        console.log('Equipment update response data:', equipResData);

        if (!equipRes.ok) {
          throw new Error(`Failed to update equipment status: ${equipRes.status} - ${JSON.stringify(equipResData)}`);
        }

        // Resolve user information
        let userName = 'Unknown User';
        let userIdNumber = '';
        let userDepartment = 'NTP';
        let reserver = null;
        
        if (reservation.user && typeof reservation.user === 'object' && reservation.user.fullname) {
          userName = reservation.user.fullname;
          userIdNumber = reservation.user.id_number || '';
          userDepartment = reservation.user.department || 'NTP';
        } else if (reservation.user_id) {
          reserver = users.find(u => String(u.id) === String(reservation.user_id));
          if (reserver) {
            userName = reserver.fullname || reserver.name || reserver.email || 'Unknown User';
            userIdNumber = reserver.id_number || '';
            userDepartment = reserver.department || 'NTP';
          }
        } else if (reservation.user_name || reservation.user_fullname) {
          userName = reservation.user_name || reservation.user_fullname;
        }

        // Step 2: Save equipment return to database
        console.log('Step 2: Saving equipment return to database...');
        const returnPayload = {
          equipment_id: equipmentItem.id,
          condition: currentReturnCondition,
          remarks: currentReturnRemarks || null,
          new_status: newEquipmentStatus,
          returned_at: new Date().toISOString(),
          reservation_id: currentReturnReservationId,
          user_id: reservation.user_id || null,
          username: userName,
          equipment_name: equipmentItem.name,
          department: userDepartment,
          id_number: userIdNumber,
          item_number: equipmentItem.item_number || equipmentItem.itemNumber || ''
        };
        
        console.log('Return payload:', returnPayload);
        
        const dbRes = await fetch(`${API_BASE_URL}/equipment-returns/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(returnPayload)
        });
        
        const dbResponseData = await dbRes.json();
        console.log('Database response:', dbResponseData);
        
        if (!dbRes.ok) {
          throw new Error(`Database error: ${dbRes.status} - ${JSON.stringify(dbResponseData)}`);
        }

        console.log('✓ Equipment return saved successfully to database');

        // Step 3: Delete the reservation
        console.log('Step 3: Deleting reservation...');
        try {
          const delRes = await fetch(`${API_BASE_URL}/reservations/${currentReturnReservationId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });
          if (!delRes.ok) {
            console.warn('Could not delete reservation, but return was saved');
          }
        } catch (err) {
          console.warn('Error deleting reservation:', err);
        }

        // Step 4: Refresh data from database
        console.log('Step 4: Refreshing data...');
        try {
          console.log('Calling fetchEquipment()...');
          await fetchEquipment();
          console.log('✓ fetchEquipment() completed');
          console.log('Current equipment state after fetch:', equipment);
        } catch (fetchErr) {
          console.error('✗ Error in fetchEquipment:', fetchErr);
          throw fetchErr;
        }
        
        await fetchReservations();
        await fetchStats();
        await fetchEquipmentReturns();

        // Show success message
        setReturnSuccessMessage('Returned Successfully!');

        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setReturnSuccessMessage('');
        }, 5000);
      } catch (err) {
        console.error('✗ Error processing equipment return:', err);
        alert(`Error: ${err.message}`);
      } finally {
        setReturnLoading(false);
      }
    })();
  };

  const handleViewReservationAdmin = (reservationId) => {
    const r = reservations.find(x => x.id === reservationId);
    if (!r) return;

    // Resolve reserver (reuse existing logic from render)
    let reserver = null;
    if (r.user && typeof r.user === 'object' && r.user.id) {
      reserver = r.user;
    } else if (r.requester && typeof r.requester === 'object') {
      reserver = r.requester;
    } else if (r.requested_by && typeof r.requested_by === 'object') {
      reserver = r.requested_by;
    } else {
      if (r.user_id != null) {
        reserver = users.find(u => String(u.id) === String(r.user_id));
      }
      if (!reserver && (r.user_email || r.email)) {
        reserver = users.find(u => String(u.email).toLowerCase() === String(r.user_email || r.email).toLowerCase());
      }
      if (!reserver && (r.id_number || r.user_id_number)) {
        reserver = users.find(u => String(u.id_number) === String(r.id_number || r.user_id_number));
      }
    }

    const fullname = reserver ? (reserver.fullname || reserver.name || reserver.email) : (r.user_name || r.user_fullname || `User #${r.user_id || 'unknown'}`);
    const department = reserver ? (reserver.department || reserver.dept || '-') : (r.department || r.dept || '-');

    // Resolve item name and image
    let itemName = r.item_name || r.itemName || '';
    let itemNumber = '';
    let imageSrc = null;
    if (r.item_type === 'equipment') {
      const found = equipment.find(e => String(e.id) === String(r.item_id));
      if (found) {
        itemName = found.name || itemName;
        itemNumber = found.item_number || found.itemNumber || '';
        imageSrc = found.image || null;
      }
    } else if (r.item_type === 'room') {
      const foundR = rooms.find(rr => String(rr.id) === String(r.item_id));
      if (foundR) {
        itemName = foundR.name || itemName;
        imageSrc = foundR.image || null;
      }
    }

    // Time label
    let timeLabel = '';
    if (r.item_type === 'equipment') {
      const t = r.time_needed || r.timeNeeded || r.time_from || r.timeFrom || r.time;
      timeLabel = t ? formatTimeWithAMPM(t) : '';
    } else {
      const start = r.time_from || r.timeFrom || r.time_needed || r.timeNeeded;
      const end = r.time_to || r.timeTo || r.timeNeeded;
      if (start && end) {
        timeLabel = `${formatTimeWithAMPM(start)} to ${formatTimeWithAMPM(end)}`;
      } else {
        const t = r.time_needed || r.timeNeeded || start || '';
        timeLabel = t ? formatTimeWithAMPM(t) : '';
      }
    }

    setViewReservation({
      id: r.id,
      itemType: r.item_type,
      itemId: r.item_id,
      itemName,
      itemNumber,
      image: imageSrc,
      fullname,
      department,
      date_needed: r.date_needed || r.dateNeeded,
      timeLabel,
      purpose: r.purpose,
      status: r.status || 'Pending'
    });
    setShowViewModal(true);
  };

  const handleSaveEditReservation = async () => {
    if (!editReservationData.id) return;

    // Validation for room reservations
    if (editReservationData.item_type === 'room') {
      if (!editReservationData.time_from || !editReservationData.time_to) {
        setEditReservationError('Please provide both start and end times for room reservations');
        return;
      }

      // Block lunch time (12:00 PM - 1:00 PM)
      const toMinutes = (timeStr) => {
        if (!timeStr) return null;
        try {
          const [hh, mm] = timeStr.split(':').map(Number);
          return hh * 60 + mm;
        } catch {
          return null;
        }
      };

      const reqStart = toMinutes(editReservationData.time_from);
      const reqEnd = toMinutes(editReservationData.time_to);
      const LUNCH_START = 12 * 60; // 12:00 PM
      const LUNCH_END = 13 * 60;   // 1:00 PM

      if (reqStart === null || reqEnd === null) {
        setEditReservationError('Invalid time format.');
        return;
      }

      if (reqStart >= reqEnd) {
        setEditReservationError('Start time must be before end time.');
        return;
      }

      if (reqStart < LUNCH_END && LUNCH_START < reqEnd) {
        setEditReservationError('Selected time overlaps lunch break (12:00 PM - 1:00 PM). Please choose another time.');
        return;
      }
    }

    if (!editReservationData.date_needed) {
      setEditReservationError('Please select a date');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/reservations/${editReservationData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          item_type: editReservationData.item_type,
          date_needed: editReservationData.date_needed,
          time_from: editReservationData.time_from,
          time_to: editReservationData.time_to,
          purpose: editReservationData.purpose
        })
      });

      if (res.ok) {
        await fetchReservations();
        setShowEditReservationModal(false);
        setEditReservationError('');
      } else {
        const error = await res.json();
        const formatted = formatApiError(error.detail || error);
        setEditReservationError(formatted || 'Failed to update reservation');
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      setEditReservationError('Error updating reservation');
    }
  };

  // Inventory management functions
  const getFilteredEquipment = () => {
    let filtered = equipment;

    // Apply search filter
    if (inventorySearchTerm.trim()) {
      const term = inventorySearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.item_number.toString().toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (inventoryStatusFilter !== 'All') {
      filtered = filtered.filter(item => {
        const status = getEquipmentStatusLabel(item);
        return status === inventoryStatusFilter;
      });
    }

    // Apply equipment name filter
    if (inventoryEquipmentNameFilter !== 'All') {
      filtered = filtered.filter(item => item.name === inventoryEquipmentNameFilter);
    }

    return filtered;
  };

  const handleEquipmentStatusQuickUpdate = async (equipmentId, newStatus) => {
    const item = equipment.find(e => e.id === equipmentId);
    if (!item) return;

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: item.name,
          item_number: item.item_number || item.itemNumber || '',
          status: newStatus,
          available: newStatus === 'Available',
          image: item.image || null
        })
      });

      if (res.ok) {
        await fetchEquipment();
        await fetchStats();
      } else {
        alert('Failed to update equipment status');
      }
    } catch (err) {
      console.error('Error updating equipment:', err);
      alert('Error updating equipment status');
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedInventoryItems.size === 0 || !bulkStatusValue) return;

    try {
      const updates = Array.from(selectedInventoryItems).map(equipmentId => {
        const item = equipment.find(e => e.id === equipmentId);
        if (!item) return null;
        return {
          id: equipmentId,
          name: item.name,
          item_number: item.item_number || item.itemNumber || '',
          status: bulkStatusValue,
          available: bulkStatusValue === 'Available',
          image: item.image || null
        };
      }).filter(Boolean);

      let successCount = 0;
      for (const update of updates) {
        const res = await fetch(`${API_BASE_URL}/equipment/${update.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(update)
        });
        if (res.ok) successCount++;
      }

      if (successCount > 0) {
        await fetchEquipment();
        await fetchStats();
        setSelectedInventoryItems(new Set());
        setShowBulkStatusModal(false);
        alert(`Updated ${successCount} items successfully`);
      }
    } catch (err) {
      console.error('Error updating equipment:', err);
      alert('Error updating equipment');
    }
  };

  const toggleInventoryItemSelection = (equipmentId) => {
    const newSelection = new Set(selectedInventoryItems);
    if (newSelection.has(equipmentId)) {
      newSelection.delete(equipmentId);
    } else {
      newSelection.add(equipmentId);
    }
    setSelectedInventoryItems(newSelection);
  };

  const readImageDataUrl = async (file) => {
    // Downscale and recompress images to keep payloads small.
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 800;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Always encode to JPEG for smaller payloads.
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleItemNameChange = (selectedName) => {
    if (!selectedName) {
      setNewEquipment({...newEquipment, name: '', customName: '', item_number: ''});
      return;
    }
    
    if (selectedName === 'Other (Custom)') {
      // For custom names, don't auto-generate item number yet
      setNewEquipment({
        ...newEquipment,
        name: selectedName,
        customName: '',
        item_number: ''
      });
      return;
    }
    
    // Count existing equipment with the same name
    const count = equipment.filter(e => e.name === selectedName).length;
    const nextNumber = count + 1;
    
    setNewEquipment({
      ...newEquipment,
      name: selectedName,
      customName: '',
      item_number: nextNumber.toString()
    });
  };

  const handleAddEquipment = async () => {
    // Determine the equipment name to use
    const equipmentName = newEquipment.name === 'Other (Custom)' 
      ? newEquipment.customName 
      : newEquipment.name;

    if (!equipmentName.trim() || !newEquipment.item_number.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // prevent duplicate entries with same name and item number
    const existingSame = equipment.find(e => 
      e.name === equipmentName && e.item_number === newEquipment.item_number.trim()
    );
    if (existingSame) {
      alert('Equipment with that name and item number already exists');
      return;
    }

    try {
      let imageData = null;
      if (newEquipment.image) {
        imageData = await readImageDataUrl(newEquipment.image);
      }

      const statusValue = newEquipment.status || 'Available';
      
      // Determine category based on equipment name
      const category = newEquipment.name === 'Other (Custom)' 
        ? equipmentName.toUpperCase()
        : getEquipmentCategory(newEquipment.name);
      
      const res = await fetch(`${API_BASE_URL}/equipment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: equipmentName,
          item_number: newEquipment.item_number.trim(),
          category: category,
          status: statusValue,
          available: statusValue.toLowerCase() === 'available',
          image: imageData
        })
      });

      if (res.ok) {
        fetchEquipment();
        setShowAddEquipmentModal(false);
        setNewEquipment({ name: '', customName: '', item_number: '', status: 'Available', image: null, imagePreview: null });
        setAddEquipmentSuccess(true);
        setTimeout(() => setAddEquipmentSuccess(false), 3500);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to add equipment');
      }
    } catch (err) {
      console.error('Error adding equipment:', err);
      alert('Error adding equipment');
    }
  };

  const handleDeleteEquipment = async (equipmentId) => {
    setEquipmentToDelete(equipmentId);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteRoom = async (roomId) => {
    setRoomToDelete(roomId);
    setShowEditRoomModal(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteEquipment = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${equipmentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (res.ok) {
        fetchEquipment();
        setShowDeleteConfirmModal(false);
        setEquipmentToDelete(null);
        alert('Equipment deleted successfully!');
      } else {
        alert('Failed to delete equipment');
      }
    } catch (err) {
      console.error('Error deleting equipment:', err);
      alert('Error deleting equipment');
    }
  };

  const confirmDeleteRoom = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${roomToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (res.ok) {
        fetchRooms();
        setShowDeleteConfirmModal(false);
        setRoomToDelete(null);
        alert('Room deleted successfully!');
      } else {
        alert('Failed to delete room');
      }
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Error deleting room');
    }
  };

  const handleEditEquipment = (item) => {
    setEditEquipmentData({
      id: item.id,
      name: item.name,
      item_number: item.item_number,
      status: item.status || (item.available ? 'Available' : 'Not Available'),
      available: item.available,
      image: null,
      imagePreview: item.image
    });
    setShowEditEquipmentModal(true);
  };

  const handleAddRoom = async () => {
    if (!newRoom.name.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // duplicate name check
    const existing = rooms.find(r => r.name === newRoom.name);
    if (existing) {
      alert('Room with that name already exists');
      return;
    }

    try {
      let imageData = null;
      if (newRoom.image) {
        const reader = new FileReader();
        imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(newRoom.image);
        });
      }
      const res = await fetch(`${API_BASE_URL}/rooms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: newRoom.name,
          available: true,
          image: imageData
        })
      });
      if (res.ok) {
        fetchRooms();
        // close modal and show page-level success banner
        setShowAddRoomModal(false);
        setNewRoom({ name: '', image: null, imagePreview: null });
        setAddRoomSuccess(true);
        // auto-hide after 3.5s
        setTimeout(() => setAddRoomSuccess(false), 3500);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to add room');
      }
    } catch (err) {
      console.error('Error adding room:', err);
      alert('Error adding room');
    }
  };

  const handleEditRoom = (room) => {
    setEditRoomData({
      id: room.id,
      name: room.name,
      available: room.available,
      image: null,
      imagePreview: room.image
    });
    setShowEditRoomModal(true);
  };

  const handleSaveRoom = async () => {
    if (!editRoomData.name.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const duplicate = rooms.find(r => r.id !== editRoomData.id && r.name === editRoomData.name);
    if (duplicate) {
      alert('Room with that name already exists');
      return;
    }

    try {
      let imageData = null;
      if (editRoomData.image && editRoomData.image instanceof File) {
        const reader = new FileReader();
        imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(editRoomData.image);
        });
      }

      const updateData = {
        name: editRoomData.name,
        available: editRoomData.available
      };

      // Only include image if a new image was selected
      if (imageData) {
        updateData.image = imageData;
      }

      const res = await fetch(`${API_BASE_URL}/rooms/${editRoomData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        fetchRooms();
        setShowEditRoomModal(false);
        setUpdateRoomSuccess(true);
        setTimeout(() => setUpdateRoomSuccess(false), 3500);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to update room');
      }
    } catch (err) {
      console.error('Error updating room:', err);
      alert('Error updating room');
    }
  };

  const handleSaveEquipment = async () => {
    if (!editEquipmentData.name.trim() || !editEquipmentData.item_number.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // check duplicates (excluding the item being edited)
    const duplicateEdit = equipment.find(e => 
      e.id !== editEquipmentData.id &&
      e.name === editEquipmentData.name &&
      e.item_number === editEquipmentData.item_number.trim()
    );
    if (duplicateEdit) {
      alert('Equipment with that name and item number already exists');
      return;
    }

    try {
      let imageData = null;
      if (editEquipmentData.image && editEquipmentData.image instanceof File) {
        imageData = await readImageDataUrl(editEquipmentData.image);
      }

      const statusValue = editEquipmentData.status || (editEquipmentData.available ? 'Available' : 'Not Available');
      
      // Determine category based on equipment name
      const category = editEquipmentData.name === 'Other (Custom)' 
        ? editEquipmentData.customName.toUpperCase()
        : getEquipmentCategory(editEquipmentData.name);
      
      const payload = {
        name: editEquipmentData.name,
        item_number: editEquipmentData.item_number.trim(),
        category: category,
        status: statusValue,
        available: statusValue.toLowerCase() === 'available'
      };

      if (imageData) {
        payload.image = imageData;
      }

      const res = await fetch(`${API_BASE_URL}/equipment/${editEquipmentData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchEquipment();
        setShowEditEquipmentModal(false);
        setUpdateEquipmentSuccess(true);
        setTimeout(() => setUpdateEquipmentSuccess(false), 3500);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to update equipment');
      }
    } catch (err) {
      console.error('Error updating equipment:', err);
      alert('Error updating equipment');
    }
  };

  const handleToggleRoomAvailability = async (room) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${room.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: room.name,
          available: !room.available
        })
      });

      if (res.ok) {
        fetchRooms();
      } else {
        alert('Failed to update room availability');
      }
    } catch (err) {
      console.error('Error toggling room availability:', err);
      alert('Error toggling room availability');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_fullname');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    setShowLogoutModal(false);
    onLogout();
  };

  return (
    <div className="admin-container">
      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-content">
          <button 
            className="admin-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`admin-nav-tabs ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button 
              className={`admin-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              DASHBOARD
            </button>
            <button 
              className={`admin-nav-tab ${activeTab === 'reservations' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('reservations');
                setMobileMenuOpen(false);
              }}
              style={{position: 'relative', paddingRight: '28px'}}
            >
              RESERVATIONS
              <span 
                className={`admin-reservation-badge ${stats.pending_reservations > 0 ? 'show' : 'hide'}`}
              >
                {stats.pending_reservations}
              </span>
            </button>
            <button 
              className={`admin-nav-tab ${activeTab === 'equipment' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('equipment');
                setMobileMenuOpen(false);
              }}
            >
              EQUIPMENTS
            </button>
            
            <button 
              className={`admin-nav-tab ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('rooms');
                setMobileMenuOpen(false);
              }}
            >
              ROOMS
            </button>
            <button 
              className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('users');
                setMobileMenuOpen(false);
              }}
            >
              USERS
            </button>
            <button 
              className={`admin-nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('inventory');
                setMobileMenuOpen(false);
              }}
            >
              INVENTORY
            </button>
            <button 
              className={`admin-nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('analytics');
                setMobileMenuOpen(false);
              }}
            >
              ANALYTICS
            </button>
          </div>
          <div className="admin-nav-right">
            <div className="admin-profile-menu">
              <button 
                className="admin-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title={adminName}
              >
                👤
              </button>
              {showProfileMenu && (
                <div className="admin-profile-dropdown">
                  <div style={{padding: '12px 18px', fontSize: '0.8rem', color: '#666', borderBottom: '1px solid #eee'}}>
                    {adminName}
                  </div>
                  <button
                    className="admin-dropdown-item logout-btn"
                    onClick={() => setShowLogoutModal(true)}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="admin-main">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Welcome, {adminName}!</h1>
           
          </div>

          {activeTab === 'dashboard' && (
            <div className="admin-section" key={activeTab}>
              <div className="dashboard-cards">
                <div className="dashboard-card">
                  <div className="card-value">{stats.total_users}</div>
                  <div className="card-label">Total Users</div>
                </div>
                <div className="dashboard-card">
                  <div className="card-value">{stats.total_equipment}</div>
                  <div className="card-label">Total Equipment</div>
                </div>
                <div className="dashboard-card">
                  <div className="card-value">{stats.total_rooms}</div>
                  <div className="card-label">Total Rooms</div>
                </div>
                <div className="dashboard-card">
                  <div className="card-value">{stats.pending_reservations}</div>
                  <div className="card-label">Pending Reservations</div>
                </div>
              </div>

              {/* Quick Insights Charts */}
              <div style={{marginTop: '40px'}}>
                <h3 style={{fontSize: '1.2rem', fontWeight: '700', marginBottom: '24px', color: '#333'}}>Quick Insights</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px'}}>
                  {/* Equipment Status Chart */}
                  <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                    <h4 style={{marginTop: 0, marginBottom: '20px', fontSize: '1rem', fontWeight: '600', color: '#333'}}>Equipment Status Overview</h4>
                    {equipment.length > 0 ? (
                      <div style={{width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <BarChart width={getChartWidth(450)} height={300} data={[
                          {name: 'Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Available').length, fill: '#12b886'},
                          {name: 'Maintenance', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Under Maintenance').length, fill: '#ffc107'},
                          {name: 'Repair', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'For Repair').length, fill: '#fd7e14'},
                          {name: 'Not Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Not Available').length, fill: '#e03131'}
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {[
                              {name: 'Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Available').length, fill: '#12b886'},
                              {name: 'Maintenance', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Under Maintenance').length, fill: '#ffc107'},
                              {name: 'Repair', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'For Repair').length, fill: '#fd7e14'},
                              {name: 'Not Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Not Available').length, fill: '#e03131'}
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </div>
                    ) : (
                      <div style={{textAlign: 'center', color: '#999', padding: '40px 0'}}>No equipment data available</div>
                    )}
                  </div>

                  {/* Reservation Type Chart */}
                  <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                    <h4 style={{marginTop: 0, marginBottom: '20px', fontSize: '1rem', fontWeight: '600', color: '#333'}}>Reservations by Type</h4>
                    {reservations.length > 0 ? (
                      <div style={{width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <BarChart width={getChartWidth(450)} height={300} data={[
                          {name: 'Equipment', count: reservations.filter(r => r.item_type === 'equipment').length},
                          {name: 'Rooms', count: reservations.filter(r => r.item_type === 'room').length}
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#12b886" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </div>
                    ) : (
                      <div style={{textAlign: 'center', color: '#999', padding: '40px 0'}}>No reservation data available</div>
                    )}
                  </div>
                </div>
                <div style={{marginTop: '30px', textAlign: 'center'}}>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                  >
                    View More Analytics →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="admin-section" key={activeTab}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2 style={{margin: 0}}>Registered Users</h2>
                <button
                  className="btn-add-equipment"
                  style={{backgroundColor: '#28a745', borderColor: '#28a745'}}
                  onClick={() => {
                    setAddUserError('');
                    setAddUserSuccess(false);
                    setAddUserData({
                      fullname: '',
                      email: '',
                      id_number: '',
                      department: '',
                      sub: '',
                      password: '',
                      confirmPassword: ''
                    });
                    setShowAddUserModal(true);
                  }}
                >
                  + Add User
                </button>
              </div>

              {userSuccessMsg && (
                <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#e6ffed', color: '#0b6b2f', borderRadius: '6px', fontWeight: 600}}>
                  <span>{userSuccessMsg}</span>
                  <button
                    onClick={() => setUserSuccessMsg('')}
                    style={{background: 'none', border: 'none', color: '#0b6b2f', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', padding: '0 0 0 10px'}}
                    aria-label="Close"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              )}

              <div style={{marginBottom: '20px'}}>
                <input
                  type="text"
                  placeholder="Search by fullname, email, ID number, or department..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div className="user-department-tabs">
                <button
                  className={`dept-tab ${userDepartmentTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => setUserDepartmentTab('ALL')}
                >
                  ALL ({users.length})
                </button>
                {['BED', 'HED', 'FACULTY', 'NTP'].map(dept => (
                  <button
                    key={dept}
                    className={`dept-tab ${userDepartmentTab === dept ? 'active' : ''}`}
                    onClick={() => setUserDepartmentTab(dept)}
                  >
                    {dept} ({users.filter(u => u.department === dept).length})
                  </button>
                ))}
              </div>

              {filteredUsers.length === 0 ? (
                <p>No users {userDepartmentTab !== 'ALL' ? `in ${userDepartmentTab} department` : 'registered yet'}</p>
              ) : (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>ID Number</th>
                        <th>Department</th>
                        <th>Date Registered</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.fullname}</td>
                          <td>{user.email}</td>
                          <td>{user.id_number}</td>
                          <td>{user.department}</td>
                          <td>{formatDate(user.created_at)}</td>
                          <td>
                            <button
                              className="btn-edit-equipment"
                              onClick={() => handleEditUser(user)}
                              style={{marginRight: '8px'}}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete-equipment"
                              onClick={() => handleDeleteUser(user)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="admin-section" key={activeTab}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{margin: 0}}>Manage Equipment</h2>
                <button 
                  className="btn-add-equipment"
                  onClick={() => setShowAddEquipmentModal(true)}
                >
                  + ADD EQUIPMENT
                </button>
              </div>

              {addEquipmentSuccess && (
                <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#e6ffed', color: '#0b6b2f', borderRadius: '6px', fontWeight: 600}}>
                  <span>Equipment added successfully!</span>
                  <button 
                    onClick={() => setAddEquipmentSuccess(false)}
                    style={{background: 'none', border: 'none', color: '#0b6b2f', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', padding: '0 0 0 10px'}}
                  >
                    ×
                  </button>
                </div>
              )}

              {updateEquipmentSuccess && (
                <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#e6ffed', color: '#0b6b2f', borderRadius: '6px', fontWeight: 600}}>
                  <span>Equipment updated successfully!</span>
                  <button 
                    onClick={() => setUpdateEquipmentSuccess(false)}
                    style={{background: 'none', border: 'none', color: '#0b6b2f', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', padding: '0 0 0 10px'}}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Equipment Statistics Summary */}
              {equipment.length > 0 && (
                <div style={{
                  marginBottom: '24px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h3 style={{margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600, color: '#333'}}>Equipment Summary</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px'
                  }}>
                    {/* Total Equipment Card */}
                    <div style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '1.8rem', fontWeight: 700}}>{equipment.length}</div>
                      <div style={{fontSize: '0.85rem', opacity: 0.9}}>Total Equipment</div>
                    </div>

                    {/* Total Available Equipment Card */}
                    <div style={{
                      backgroundColor: '#198754',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '1.8rem', fontWeight: 700}}>
                        {equipment.filter(item => item.available === true || String(item.status || '').toLowerCase() === 'available').length}
                      </div>
                      <div style={{fontSize: '0.85rem', opacity: 0.9}}>Total Available</div>
                    </div>

                    {/* Equipment by Type */}
                    {(() => {
                      const equipmentStats = {};
                      equipment.forEach(item => {
                        const type = item.name || 'Unknown';
                        if (!equipmentStats[type]) {
                          equipmentStats[type] = { total: 0, in: 0, out: 0 };
                        }
                        equipmentStats[type].total += 1;

                        // Determine availability based on explicit flag or status field
                        const isAvailable = item.available === true || String(item.status || '').toLowerCase() === 'available';
                        if (isAvailable) {
                          equipmentStats[type].in += 1;
                        } else {
                          equipmentStats[type].out += 1;
                        }
                      });

                      // Separate custom equipment from predefined equipment
                      const predefinedItems = Object.entries(equipmentStats).filter(([type]) => ITEM_NAMES.includes(type));
                      const customItems = Object.entries(equipmentStats).filter(([type]) => !ITEM_NAMES.includes(type));

                      // Sort both lists by count descending
                      predefinedItems.sort(([, a], [, b]) => b.total - a.total);
                      customItems.sort(([, a], [, b]) => b.total - a.total);

                      // Combine: always show custom items first, then fill with top predefined items
                      const remainingSlots = 7 - customItems.length;
                      const displayItems = [...customItems, ...predefinedItems.slice(0, remainingSlots)];
                      
                      const colors = ['#8b95a4', '#8b95a4', '#8b95a4', '#8b95a4', '#8b95a4', '#8b95a4', '#8b95a4'];
                      
                      return displayItems.map(([type, stats], idx) => (
                        <div key={type} style={{
                          backgroundColor: colors[idx % colors.length],
                          color: 'white',
                          padding: '12px',
                          borderRadius: '6px',
                          textAlign: 'center'
                        }}>
                          <div style={{fontSize: '1.6rem', fontWeight: 700}}>{stats.total}</div>
                          <div style={{fontSize: '0.8rem', maxHeight: '2.4em', overflow: 'hidden', wordBreak: 'break-word'}}>{type}</div>
                          <div style={{display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap'}}>
                            <span style={{backgroundColor: '#d4edda', color: '#0f5132', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600}}>
                              IN {stats.in}
                            </span>
                            <span style={{backgroundColor: '#f8d7da', color: '#842029', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600}}>
                              OUT {stats.out}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {equipment.length === 0 ? (
                <p>No equipment registered yet</p>
              ) : (
                <>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <label htmlFor="equipment-filter" style={{fontWeight: 600, color: '#334155'}}>Filter:</label>
                      <select
                        id="equipment-filter"
                        value={equipmentFilter}
                        onChange={e => setEquipmentFilter(e.target.value)}
                        style={{padding: '6px 10px', borderRadius: '999px', border: '1px solid #cbd5e1', background: 'white'}}
                      >
                        <option value="">All equipment</option>
                        {equipmentTypes.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    {equipmentFilter && (
                      <button
                        onClick={() => setEquipmentFilter('')}
                        style={{padding: '6px 12px', borderRadius: '999px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer'}}
                      >
                        Clear filter
                      </button>
                    )}
                  </div>

                  <div className="equipment-table-container">
                    <table className="equipment-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Equipment Name</th>
                          <th>Item Number</th>
                          <th>Image</th>
                          <th>Status</th>
                          <th>Date Added</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment
                          .filter(item => !equipmentFilter || (item.name || '').toLowerCase().includes(equipmentFilter.toLowerCase()))
                          .map(item => (
                            <tr key={item.id}>
                              <td>{item.id}</td>
                              <td>{item.name}</td>
                              <td>{item.item_number}</td>
                              <td>
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    style={{maxWidth: '50px', maxHeight: '50px', borderRadius: '4px'}}
                                  />
                                ) : (
                                  <span style={{color: '#999', fontSize: '0.9rem'}}>No image</span>
                                )}
                              </td>
                              <td>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  ...getEquipmentStatusStyles(getEquipmentStatusLabel(item)),
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleEditEquipment(item)}
                                title="Click to edit status"
                                >
                                  {getEquipmentStatusLabel(item)}
                                </span>
                              </td>
                              <td>{formatDate(item.created_at)}</td>
                              <td>
                                <button
                                  className="btn-edit-equipment"
                                  onClick={() => handleEditEquipment(item)}
                                  style={{marginRight: '8px'}}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-delete-equipment"
                                  onClick={() => handleDeleteEquipment(item.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="admin-section" key={activeTab}>
              <h2>Inventory Management</h2>
              <p style={{color: '#666'}}>Manage equipment inventory, track status, and update items in bulk.</p>

              {/* Stats by Status */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '18px', marginBottom: '24px'}}>
                <div style={{background: '#e7f5ff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #1971c2'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1971c2'}}>{equipment.length}</div>
                  <div style={{color: '#555', fontWeight: 600, fontSize: '0.9rem'}}>Total Items</div>
                </div>
                <div style={{background: '#e6fcf5', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #12b886'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#12b886'}}>{equipment.filter(e => getEquipmentStatusLabel(e) === 'Available').length}</div>
                  <div style={{color: '#555', fontWeight: 600, fontSize: '0.9rem'}}>Available</div>
                </div>
                <div style={{background: '#fff3e0', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59f00'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#f59f00'}}>{equipment.filter(e => getEquipmentStatusLabel(e) === 'Under Maintenance').length}</div>
                  <div style={{color: '#555', fontWeight: 600, fontSize: '0.9rem'}}>Maintenance</div>
                </div>
                <div style={{background: '#ffe0e6', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #e03131'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#e03131'}}>{equipment.filter(e => getEquipmentStatusLabel(e) === 'For Repair').length}</div>
                  <div style={{color: '#555', fontWeight: 600, fontSize: '0.9rem'}}>For Repair</div>
                </div>
                <div style={{background: '#f1f3f5', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #868e96'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#868e96'}}>{equipment.filter(e => getEquipmentStatusLabel(e) === 'Not Available').length}</div>
                  <div style={{color: '#555', fontWeight: 600, fontSize: '0.9rem'}}>Not Available</div>
                </div>
              </div>

              {/* Search and Filters */}
              <div style={{background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
                <div style={{marginBottom: '12px'}}>
                  <label style={{display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px'}}>Search Equipment</label>
                  <input
                    type="text"
                    placeholder="Search by name or item number..."
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    className="equipment-input"
                    style={{width: '100%'}}
                  />
                </div>
                <div style={{marginBottom: '12px'}}>
                  <label style={{display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px'}}>Filter by Status</label>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {['All', 'Available', 'Under Maintenance', 'For Repair', 'Not Available'].map(status => (
                      <button
                        key={status}
                        onClick={() => setInventoryStatusFilter(status)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #dee2e6',
                          background: inventoryStatusFilter === status ? '#1971c2' : '#fff',
                          color: inventoryStatusFilter === status ? '#fff' : '#333',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedInventoryItems.size > 0 && (
                  <button
                    onClick={() => setShowBulkStatusModal(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#ff922b',
                      color: 'white',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    Bulk Update ({selectedInventoryItems.size} selected)
                  </button>
                )}
              </div>

              {/* Equipment Table Toggle Button */}
              <div style={{marginBottom: '20px'}}>
                <button
                  onClick={() => setShowInventoryTable(!showInventoryTable)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: showInventoryTable ? '#e03131' : '#1971c2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {showInventoryTable ? '▼ Hide Equipments' : '▶ View Equipments'}
                </button>
              </div>

              {/* Equipment Name Tabs */}
              {showInventoryTable && (
                <div style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    <button
                      onClick={() => setInventoryEquipmentNameFilter('All')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                        background: inventoryEquipmentNameFilter === 'All' ? '#1971c2' : '#fff',
                        color: inventoryEquipmentNameFilter === 'All' ? '#fff' : '#333',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      All ({(() => {
                        let filtered = equipment;
                        if (inventorySearchTerm.trim()) {
                          const term = inventorySearchTerm.toLowerCase();
                          filtered = filtered.filter(item =>
                            item.name.toLowerCase().includes(term) ||
                            item.item_number.toString().toLowerCase().includes(term)
                          );
                        }
                        if (inventoryStatusFilter !== 'All') {
                          filtered = filtered.filter(item => {
                            const status = getEquipmentStatusLabel(item);
                            return status === inventoryStatusFilter;
                          });
                        }
                        return filtered.length;
                      })()})
                    </button>
                    {Array.from(new Set(equipment.map(e => e.name)))
                      .sort()
                      .map(equipmentName => {
                        const count = (() => {
                          let filtered = equipment;
                          if (inventorySearchTerm.trim()) {
                            const term = inventorySearchTerm.toLowerCase();
                            filtered = filtered.filter(item =>
                              item.name.toLowerCase().includes(term) ||
                              item.item_number.toString().toLowerCase().includes(term)
                            );
                          }
                          if (inventoryStatusFilter !== 'All') {
                            filtered = filtered.filter(item => {
                              const status = getEquipmentStatusLabel(item);
                              return status === inventoryStatusFilter;
                            });
                          }
                          return filtered.filter(e => e.name === equipmentName).length;
                        })();
                        return (
                          <button
                            key={equipmentName}
                            onClick={() => setInventoryEquipmentNameFilter(equipmentName)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              border: '1px solid #dee2e6',
                              background: inventoryEquipmentNameFilter === equipmentName ? '#1971c2' : '#fff',
                              color: inventoryEquipmentNameFilter === equipmentName ? '#fff' : '#333',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {equipmentName} ({count})
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Equipment Table */}
              {showInventoryTable && (
                <div className="equipment-table-container">
                  <table className="equipment-table">
                  <thead>
                    <tr>
                      <th style={{width: '40px'}}>
                        <input
                          type="checkbox"
                          checked={selectedInventoryItems.size === getFilteredEquipment().length && getFilteredEquipment().length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInventoryItems(new Set(getFilteredEquipment().map(item => item.id)));
                            } else {
                              setSelectedInventoryItems(new Set());
                            }
                          }}
                          style={{cursor: 'pointer'}}
                        />
                      </th>
                      <th>Equipment Name</th>
                      <th>Item #</th>
                      <th>Status</th>
                      <th>Date Added</th>
                      <th>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredEquipment().length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{textAlign: 'center', color: '#999', padding: '20px'}}>
                          No equipment found
                        </td>
                      </tr>
                    ) : (
                      getFilteredEquipment().map(item => (
                        <tr key={`inv-${item.id}`} style={{background: selectedInventoryItems.has(item.id) ? '#e7f5ff' : '#fff'}}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedInventoryItems.has(item.id)}
                              onChange={() => toggleInventoryItemSelection(item.id)}
                              style={{cursor: 'pointer'}}
                            />
                          </td>
                          <td style={{fontWeight: '500'}}>{item.name}</td>
                          <td>{item.item_number}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              ...getEquipmentStatusStyles(getEquipmentStatusLabel(item)),
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              {getEquipmentStatusLabel(item)}
                            </span>
                          </td>
                          <td style={{fontSize: '0.9rem', color: '#666'}}>{formatDate(item.created_at)}</td>
                          <td>
                            <select
                              value={getEquipmentStatusLabel(item)}
                              onChange={(e) => handleEquipmentStatusQuickUpdate(item.id, e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid #dee2e6',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="Available">Available</option>
                              <option value="Not Available">Not Available</option>
                              <option value="Under Maintenance">Maintenance</option>
                              <option value="For Repair">Repair</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div style={{marginTop: '30px'}}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '16px', marginTop: 0}}>Recent Returns</h3>
              
              {/* Summary Stats */}
              {recentReturns.length > 0 && (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px'}}>
                  <div style={{background: '#e3f2fd', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #1976d2'}}>
                    <div style={{fontSize: '0.8rem', color: '#555', fontWeight: '600', marginBottom: '4px'}}>TOTAL RETURNS</div>
                    <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#1976d2'}}>{recentReturns.length}</div>
                  </div>
                  <div style={{background: '#e8f5e9', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #388e3c'}}>
                    <div style={{fontSize: '0.8rem', color: '#555', fontWeight: '600', marginBottom: '4px'}}>GOOD CONDITION</div>
                    <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#388e3c'}}>{recentReturns.filter(r => r.condition === 'good').length}</div>
                  </div>
                  <div style={{background: '#fff3e0', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #f57c00'}}>
                    <div style={{fontSize: '0.8rem', color: '#555', fontWeight: '600', marginBottom: '4px'}}>MAINTENANCE</div>
                    <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#f57c00'}}>{recentReturns.filter(r => r.condition === 'maintenance').length}</div>
                  </div>
                  <div style={{background: '#ffebee', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #d32f2f'}}>
                    <div style={{fontSize: '0.8rem', color: '#555', fontWeight: '600', marginBottom: '4px'}}>DAMAGED</div>
                    <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#d32f2f'}}>{recentReturns.filter(r => r.condition === 'damaged').length}</div>
                  </div>
                </div>
              )}
              
              {/* Filters */}
              {recentReturns.length > 0 && (
                <div style={{background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px'}}>
                    <input
                      type="date"
                      value={returnsDateFilter}
                      onChange={(e) => setReturnsDateFilter(e.target.value)}
                      placeholder="Filter by date"
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem'}}
                    />
                    <select
                      value={returnsDepartmentFilter}
                      onChange={(e) => setReturnsDepartmentFilter(e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem'}}
                    >
                      <option value="All">All Departments</option>
                      {[...new Set(recentReturns.map(r => r.department === 'Unknown' ? 'NTP' : r.department))].map(dept => (
                        <option key={dept} value={dept}>{dept} ({recentReturns.filter(r => (r.department === 'Unknown' ? 'NTP' : r.department) === dept).length})</option>
                      ))}
                    </select>
                    <select
                      value={returnsConditionFilter}
                      onChange={(e) => setReturnsConditionFilter(e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem'}}
                    >
                      <option value="All">All Conditions</option>
                      <option value="good">Good Condition ({recentReturns.filter(r => r.condition === 'good').length})</option>
                      <option value="damaged">Damaged ({recentReturns.filter(r => r.condition === 'damaged').length})</option>
                      <option value="maintenance">Maintenance Needed ({recentReturns.filter(r => r.condition === 'maintenance').length})</option>
                    </select>
                    <input
                      type="text"
                      value={returnsSearchTerm}
                      onChange={(e) => setReturnsSearchTerm(e.target.value)}
                      placeholder="Search by user, equipment, or remarks..."
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem'}}
                    />
                  </div>
                  {(returnsDateFilter || returnsDepartmentFilter !== 'All' || returnsConditionFilter !== 'All' || returnsSearchTerm) && (
                    <button
                      onClick={() => {
                        setReturnsDateFilter('');
                        setReturnsDepartmentFilter('All');
                        setReturnsConditionFilter('All');
                        setReturnsSearchTerm('');
                      }}
                      style={{padding: '6px 12px', backgroundColor: '#e9ecef', color: '#666', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'}}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              {recentReturns.length === 0 ? (
                <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                  <p>No equipment returns yet.</p>
                </div>
              ) : (
                <>
                  <div style={{overflowX: 'auto', marginBottom: '30px'}}>
                    {(() => {
                      // Get current week's date range
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay());
                      
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(startOfWeek.getDate() + 6);
                      
                      const filtered = recentReturns.filter(ret => {
                        const matchDate = !returnsDateFilter || ret.returnDate === new Date(returnsDateFilter).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                        const matchDept = returnsDepartmentFilter === 'All' || (ret.department === 'Unknown' ? 'NTP' : ret.department) === returnsDepartmentFilter;
                        const matchCondition = returnsConditionFilter === 'All' || ret.condition === returnsConditionFilter;
                        const matchSearch = !returnsSearchTerm || 
                          ret.userName.toLowerCase().includes(returnsSearchTerm.toLowerCase()) ||
                          ret.equipmentName.toLowerCase().includes(returnsSearchTerm.toLowerCase()) ||
                          (ret.remarks && ret.remarks.toLowerCase().includes(returnsSearchTerm.toLowerCase()));
                        
                        // If not showing all returns and no filters are applied, show only this week's returns
                        let matchWeek = true;
                        if (!showAllReturns && !returnsDateFilter && returnsDepartmentFilter === 'All' && returnsConditionFilter === 'All' && !returnsSearchTerm) {
                          try {
                            const returnDateParts = ret.returnDate.split('/');
                            const returnDate = new Date(returnDateParts[2], returnDateParts[0] - 1, returnDateParts[1]);
                            matchWeek = returnDate >= startOfWeek && returnDate <= endOfWeek;
                          } catch (e) {
                            matchWeek = true;
                          }
                        }
                        
                        return matchDate && matchDept && matchCondition && matchSearch && matchWeek;
                      });

                      return (
                        <>
                          {filtered.length === 0 ? (
                            <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#999'}}>
                              <p>No returns match your filters.</p>
                            </div>
                          ) : (
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                              <thead>
                                <tr style={{background: '#f8f9fa', borderBottom: '2px solid #ddd'}}>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>User Name</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>ID Number</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Department</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Equipment Name</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Item #</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Condition</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Return Date</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Return Time</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>New Status</th>
                                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Admin Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((ret, idx) => (
                                  <tr key={idx} style={{borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa'}}>
                                    <td style={{padding: '12px'}}>{ret.userName}</td>
                                    <td style={{padding: '12px'}}>{ret.idNumber}</td>
                                    <td style={{padding: '12px'}}>{ret.department}</td>
                                    <td style={{padding: '12px'}}>{ret.equipmentName}</td>
                                    <td style={{padding: '12px'}}>{ret.itemNumber}</td>
                                    <td style={{padding: '12px'}}><span style={{background: ret.condition === 'good' ? '#d4edda' : ret.condition === 'damaged' ? '#f8d7da' : '#fff3cd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'}}>{ret.conditionLabel}</span></td>
                                    <td style={{padding: '12px'}}>{ret.returnDate}</td>
                                    <td style={{padding: '12px'}}>{ret.returnTime}</td>
                                    <td style={{padding: '12px'}}><span style={{background: ret.newStatus === 'Available' ? '#d4edda' : ret.newStatus === 'For Repair' ? '#f8d7da' : '#fff3cd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'}}>{ret.newStatus}</span></td>
                                    <td style={{padding: '12px', maxWidth: '200px', wordWrap: 'break-word'}}>{ret.remarks || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Toggle View Buttons - Outside scroll area for easy access */}
                  {recentReturns.length > 0 && (
                    <div style={{display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '30px'}}>
                      {!showAllReturns && (
                        <button
                          onClick={() => setShowAllReturns(true)}
                          style={{padding: '10px 24px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.3s ease'}}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#154fa5'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#1976d2'}
                        >
                          See More ({recentReturns.length} total)
                        </button>
                      )}
                      {showAllReturns && (
                        <button
                          onClick={() => setShowAllReturns(false)}
                          style={{padding: '10px 24px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.3s ease'}}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                        >
                          Show This Week
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="admin-section" key={activeTab}>
              <h2>Analytics</h2>
              <p style={{color: '#666'}}>Quick insights about reservations and usage.</p>

              {/* Pending Reservations Alert */}
              {stats.pending_reservations > 0 && (
                <div style={{marginBottom: '24px', padding: '16px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ffc107', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div>
                    <div style={{fontSize: '1.1rem', fontWeight: '700', color: '#f59f00', marginBottom: '4px'}}>
                      ⚠️ {stats.pending_reservations} Pending Reservation{stats.pending_reservations !== 1 ? 's' : ''}
                    </div>
                    <div style={{fontSize: '0.9rem', color: '#856404'}}>
                      Action required - review and approve or reject pending requests
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('reservations')}
                    style={{padding: '8px 16px', backgroundColor: '#ffc107', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '12px'}}
                  >
                    View Reservations
                  </button>
                </div>
              )}

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '18px'}}>
                <div style={{background: '#f8f9fa', padding: '18px', borderRadius: '8px'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700}}>{stats.pending_reservations}</div>
                  <div style={{color: '#666', fontWeight: 600}}>Pending Reservations</div>
                </div>
                <div style={{background: '#f8f9fa', padding: '18px', borderRadius: '8px'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700}}>{stats.total_equipment}</div>
                  <div style={{color: '#666', fontWeight: 600}}>Total Equipment</div>
                </div>
                <div style={{background: '#f8f9fa', padding: '18px', borderRadius: '8px'}}>
                  <div style={{fontSize: '1.4rem', fontWeight: 700}}>{stats.total_rooms}</div>
                  <div style={{color: '#666', fontWeight: 600}}>Total Rooms</div>
                </div>
              </div>

              {/* Charts Section */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px', marginTop: '30px'}}>
                {/* Equipment Status Chart */}
                <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                  <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.1rem'}}>Equipment Status Breakdown</h3>
                  {equipment.length > 0 ? (
                    <div style={{width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <BarChart width={getChartWidth(450)} height={300} data={[
                        {name: 'Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Available').length, fill: '#12b886'},
                        {name: 'Maintenance', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Under Maintenance').length, fill: '#ffc107'},
                        {name: 'Repair', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'For Repair').length, fill: '#fd7e14'},
                        {name: 'Not Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Not Available').length, fill: '#e03131'}
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {[
                            {name: 'Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Available').length, fill: '#12b886'},
                            {name: 'Maintenance', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Under Maintenance').length, fill: '#ffc107'},
                            {name: 'Repair', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'For Repair').length, fill: '#fd7e14'},
                            {name: 'Not Available', count: equipment.filter(e => getEquipmentStatusLabel(e) === 'Not Available').length, fill: '#e03131'}
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center', color: '#999', padding: '40px 0'}}>No equipment data available</div>
                  )}
                </div>

                {/* Reservation Type Chart */}
                <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                  <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.1rem'}}>Reservations by Type</h3>
                  {reservations.length > 0 ? (
                    <div style={{width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <BarChart width={getChartWidth(450)} height={300} data={[
                        {name: 'Equipment', count: reservations.filter(r => r.item_type === 'equipment').length},
                        {name: 'Rooms', count: reservations.filter(r => r.item_type === 'room').length}
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#12b886" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center', color: '#999', padding: '40px 0'}}>No reservation data available</div>
                  )}
                </div>

                {/* Equipment Usage Chart */}
                <div style={{background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px'}}>
                    <div>
                      <h3 style={{marginTop: 0, marginBottom: '4px', fontSize: '1.3rem', fontWeight: '700', color: '#1a1a1a'}}>Most Used Equipment</h3>
                      <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Track which equipment is used most frequently</p>
                    </div>
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                      {['week', 'month', 'year'].map((filter) => (
                        <button 
                          key={filter}
                          onClick={() => {
                            if (filter === 'week') setEquipmentUsageFilter('week');
                            else if (filter === 'month') setEquipmentUsageFilter(equipmentUsageFilter === 'month' ? 'week' : 'month');
                            else setEquipmentUsageFilter(equipmentUsageFilter === 'year' ? 'week' : 'year');
                          }}
                          style={{
                            padding: '8px 14px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            backgroundColor: equipmentUsageFilter === filter ? '#1971c2' : '#f0f2f5',
                            color: equipmentUsageFilter === filter ? '#fff' : '#495057',
                            transition: 'all 0.3s ease',
                            boxShadow: equipmentUsageFilter === filter ? '0 2px 4px rgba(25, 113, 194, 0.2)' : 'none'
                          }}
                        >
                          {filter === 'week' ? 'This Week' : filter === 'month' ? 'By Month' : 'By Year'}
                        </button>
                      ))}
                      
                      {equipmentUsageFilter === 'month' && (
                        <select 
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            backgroundColor: '#fff',
                            fontWeight: '500'
                          }}
                        >
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                      )}
                      
                      {equipmentUsageFilter === 'year' && (
                        <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            backgroundColor: '#fff',
                            fontWeight: '500'
                          }}
                        >
                          {[...Array(5)].map((_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return <option key={year} value={year}>{year}</option>;
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                  
                  {(() => {
                    const equipmentData = getEquipmentUsageData();
                    const hasData = equipmentData.length > 0;
                    const totalReturns = equipmentData.reduce((sum, item) => sum + item.count, 0);
                    const colors = ['#1971c2', '#12b886', '#f59f00', '#e03131', '#a65628', '#6c757d', '#0c5aa0', '#0f8338', '#c77700', '#a61e4d'];
                    
                    return (
                      <>
                        {hasData ? (
                          <div>
                            {/* Quick Stats */}
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px'}}>
                              <div style={{background: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e9ecef', textAlign: 'center'}}>
                                <div style={{fontSize: '0.85rem', color: '#666', marginBottom: '4px'}}>Total Returns</div>
                                <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#1971c2'}}>{totalReturns}</div>
                              </div>
                              <div style={{background: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e9ecef', textAlign: 'center'}}>
                                <div style={{fontSize: '0.85rem', color: '#666', marginBottom: '4px'}}>Equipment Types</div>
                                <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#12b886'}}>{equipmentData.length}</div>
                              </div>
                              <div style={{background: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e9ecef', textAlign: 'center'}}>
                                <div style={{fontSize: '0.85rem', color: '#666', marginBottom: '4px'}}>Avg per Equipment</div>
                                <div style={{fontSize: '1.8rem', fontWeight: '700', color: '#f59f00'}}>{(totalReturns / equipmentData.length).toFixed(1)}</div>
                              </div>
                            </div>
                            
                            {/* Chart */}
                            <div style={{width: '100%', height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'}}>
                              <BarChart width={getChartWidth(750)} height={380} data={equipmentData} margin={{top: 20, right: 30, left: 20, bottom: 100}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                                <XAxis 
                                  dataKey="name" 
                                  angle={-45}
                                  textAnchor="end"
                                  height={120}
                                  interval={0}
                                  tick={{fontSize: 12, fill: '#495057'}}
                                />
                                <YAxis tick={{fontSize: 12, fill: '#495057'}} />
                                <Tooltip 
                                  contentStyle={{background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}
                                  formatter={(value) => [`${value} returns`, 'Count']}
                                  cursor={{fill: 'rgba(25, 113, 194, 0.05)'}}
                                />
                                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                                  {equipmentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </div>
                            
                            {/* Summary Card */}
                            <div style={{background: 'linear-gradient(135deg, #f8f9fa 0%, #eef2ff 100%)', padding: '16px', borderRadius: '8px', border: '1px solid #d0d8ff'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                <span style={{fontSize: '1.4rem'}}>🏆</span>
                                <div style={{flex: 1}}>
                                  <div style={{fontSize: '0.85rem', color: '#666', marginBottom: '2px'}}>Most Used Equipment</div>
                                  <div style={{fontSize: '1.1rem', fontWeight: '700', color: '#1a1a1a'}}>
                                    {equipmentData[0].name} 
                                    <span style={{fontWeight: '500', color: '#1971c2', marginLeft: '8px'}}>({equipmentData[0].count} {equipmentData[0].count === 1 ? 'return' : 'returns'})</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{textAlign: 'center', padding: '60px 20px', color: '#999'}}>
                            <div style={{fontSize: '3rem', marginBottom: '12px'}}>📭</div>
                            <div style={{fontSize: '1rem', marginBottom: '8px'}}>No data available</div>
                            <div style={{fontSize: '0.85rem'}}>No equipment returns for the selected period</div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Department Distribution Chart */}
                <div style={{background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                  <h3 style={{marginTop: 0, marginBottom: '12px', fontSize: '1rem', fontWeight: '600', color: '#1a1a1a'}}>Users by Department</h3>
                  {users.length > 0 ? (
                    <div style={{width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <BarChart width={getChartWidth(420)} height={240} data={['BED', 'HED', 'FACULTY', 'NTP'].map(dept => ({
                        name: dept,
                        count: users.filter(u => u.department === dept).length
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#e03131" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center', color: '#999', padding: '20px 0'}}>No user data available</div>
                  )}
                </div>

                {/* Reservations by Department Chart */}
                <div style={{background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                    <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1rem', fontWeight: '600', color: '#1a1a1a'}}>Most Active Departments</h3>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <select 
                        value={activeDeptMonth}
                        onChange={(e) => setActiveDeptMonth(parseInt(e.target.value))}
                        style={{padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', fontFamily: 'Poppins', cursor: 'pointer'}}
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                          <option key={idx} value={idx}>{month}</option>
                        ))}
                      </select>
                      <select 
                        value={activeDeptYear}
                        onChange={(e) => setActiveDeptYear(parseInt(e.target.value))}
                        style={{padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', fontFamily: 'Poppins', cursor: 'pointer'}}
                      >
                        {[2024, 2025, 2026, 2027].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {equipmentReturns.length > 0 ? (
                    <div style={{width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <BarChart width={getChartWidth(420)} height={240} data={['BED', 'HED', 'FACULTY', 'NTP'].map(dept => {
                        const filteredReturns = equipmentReturns.filter(r => {
                          if (!r.returnDate) return false;
                          const retDate = new Date(r.returnDate);
                          return retDate.getMonth() === activeDeptMonth && retDate.getFullYear() === activeDeptYear && (r.department || r.user_department || '') === dept;
                        });
                        return {
                          name: dept,
                          count: filteredReturns.length
                        };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#12b886" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center', color: '#999', padding: '20px 0'}}>No return data available</div>
                  )}
                </div>

                {/* Equipment Condition Breakdown Chart */}
                <div style={{background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                    <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1rem', fontWeight: '600', color: '#1a1a1a'}}>Equipment Returns by Condition</h3>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <select 
                        value={returnsConditionMonth}
                        onChange={(e) => setReturnsConditionMonth(parseInt(e.target.value))}
                        style={{padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', fontFamily: 'Poppins', cursor: 'pointer'}}
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                          <option key={idx} value={idx}>{month}</option>
                        ))}
                      </select>
                      <select 
                        value={returnsConditionYear}
                        onChange={(e) => setReturnsConditionYear(parseInt(e.target.value))}
                        style={{padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', fontFamily: 'Poppins', cursor: 'pointer'}}
                      >
                        {[2024, 2025, 2026, 2027].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {equipmentReturns.length > 0 ? (
                    <div style={{width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <BarChart width={getChartWidth(420)} height={240} data={['good', 'damaged', 'maintenance'].map(condition => {
                        const filteredReturns = equipmentReturns.filter(r => {
                          if (!r.returnDate) return false;
                          const retDate = new Date(r.returnDate);
                          return retDate.getMonth() === returnsConditionMonth && retDate.getFullYear() === returnsConditionYear && (r.condition || '').toLowerCase() === condition;
                        });
                        return {
                          name: condition.charAt(0).toUpperCase() + condition.slice(1),
                          count: filteredReturns.length
                        };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {['good', 'damaged', 'maintenance'].map((condition, idx) => (
                            <Cell 
                              key={`cell-${idx}`} 
                              fill={condition === 'good' ? '#12b886' : condition === 'damaged' ? '#e03131' : '#ffc107'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center', color: '#999', padding: '20px 0'}}>No return data available</div>
                  )}
                </div>
              </div>

              {/* Predictive Analytics Section */}
              <div style={{marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e9ecef'}}>
                <h2 style={{fontSize: '1.4rem', marginBottom: '24px', color: '#333'}}>Predictive Analytics</h2>
                <p style={{color: '#666', marginBottom: '24px'}}>Forecast equipment demand and peak usage periods to optimize operations.</p>

                <>
                    {/* Peak Usage Section */}
                    {peakUsageData && (
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                        {/* Peak Days */}
                        <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                          <h4 style={{marginTop: 0, marginBottom: '16px', fontSize: '1rem', fontWeight: '600', color: '#333'}}>📅 Peak Reservation Days</h4>
                          {peakUsageData.peak_days && peakUsageData.peak_days.length > 0 ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                              {peakUsageData.peak_days.map((item, idx) => (
                                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px'}}>
                                  <span style={{fontWeight: '500'}}>{item.day}</span>
                                  <span style={{background: '#1971c2', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600'}}>{item.reservations} reservations</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{color: '#999', textAlign: 'center', padding: '20px'}}>No peak day data available</div>
                          )}
                        </div>

                        {/* Peak Times */}
                        <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                          <h4 style={{marginTop: 0, marginBottom: '16px', fontSize: '1rem', fontWeight: '600', color: '#333'}}>⏰ Peak Reservation Hours</h4>
                          {peakUsageData.peak_times && peakUsageData.peak_times.length > 0 ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                              {peakUsageData.peak_times.map((item, idx) => (
                                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px'}}>
                                  <span style={{fontWeight: '500'}}>{formatTime12Hour(item.time)}</span>
                                  <span style={{background: '#f59f00', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600'}}>{item.reservations} bookings</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{color: '#999', textAlign: 'center', padding: '20px'}}>No peak time data available</div>
                          )}
                        </div>

                        {/* Top Equipment */}
                        <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                          <h4 style={{marginTop: 0, marginBottom: '16px', fontSize: '1rem', fontWeight: '600', color: '#333'}}>🎯 Most Demanded Equipment</h4>
                          {peakUsageData.equipment_demand && peakUsageData.equipment_demand.length > 0 ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                              {peakUsageData.equipment_demand.map((item, idx) => (
                                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px'}}>
                                  <span style={{fontWeight: '500', width: '70%', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.equipment}</span>
                                  <span style={{background: '#12b886', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600'}}>{item.demand} bookings</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{color: '#999', textAlign: 'center', padding: '20px'}}>No equipment demand data available</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Equipment Health Section */}
                    {equipmentHealth && (
                      <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '30px'}}>
                        <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                          <h4 style={{marginTop: 0, marginBottom: '4px', fontSize: '1rem', fontWeight: '600', color: '#333'}}>🔧 Equipment Health Dashboard</h4>
                          <p style={{margin: '0 0 16px 0', fontSize: '0.9rem', color: '#666'}}>Overall damage rate: <strong style={{color: equipmentHealth.overall_damage_rate > 20 ? '#d32f2f' : '#2e7d32'}}>{equipmentHealth.overall_damage_rate}%</strong> • Total returns: <strong>{equipmentHealth.total_returns}</strong></p>
                          
                          {equipmentHealth.at_risk_equipment && equipmentHealth.at_risk_equipment.length > 0 && (
                            <div style={{background: '#ffebee', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #ef5350'}}>
                              <div style={{fontWeight: '600', color: '#c62828', marginBottom: '8px', fontSize: '0.95rem'}}>⚠️ {equipmentHealth.at_risk_equipment.length} Equipment Needs Attention</div>
                              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                {equipmentHealth.at_risk_equipment.map((eq, idx) => (
                                  <div key={idx} style={{padding: '8px', background: '#fff', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem'}}>
                                    <div>
                                      <div style={{fontWeight: '600', marginBottom: '2px'}}>{eq.equipment}</div>
                                      <div style={{fontSize: '0.85rem', color: '#666'}}>Health: {eq.health_score}% • Damage rate: {eq.damage_rate}%</div>
                                    </div>
                                    <span style={{background: eq.status === 'Poor' ? '#d32f2f' : '#f57c00', color: '#fff', padding: '4px 8px', borderRadius: '3px', fontSize: '0.8rem', fontWeight: '600'}}>{eq.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div style={{marginBottom: '16px'}}>
                            <div style={{fontWeight: '600', marginBottom: '8px', fontSize: '0.95rem', color: '#333'}}>All Equipment Status</div>
                            {equipmentHealth.equipment_health && equipmentHealth.equipment_health.length > 0 ? (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                {equipmentHealth.equipment_health.map((eq, idx) => (
                                  <div key={idx} style={{padding: '10px', background: '#f8f9fa', borderRadius: '6px'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px'}}>
                                      <span style={{fontWeight: '500', fontSize: '0.95rem'}}>{eq.equipment}</span>
                                      <span style={{fontSize: '0.85rem', background: eq.health_score >= 90 ? '#d4edda' : eq.health_score >= 70 ? '#d1ecf1' : eq.health_score >= 50 ? '#fff3cd' : '#f8d7da', color: eq.health_score >= 90 ? '#155724' : eq.health_score >= 70 ? '#0c5460' : eq.health_score >= 50 ? '#856404' : '#721c24', padding: '2px 8px', borderRadius: '3px', fontWeight: '600'}}>{eq.status}</span>
                                    </div>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.85rem'}}>
                                      <div><span style={{color: '#666'}}>Health:</span> <strong>{eq.health_score}%</strong></div>
                                      <div><span style={{color: '#666'}}>Good:</span> <strong>{eq.good_condition}</strong></div>
                                      <div><span style={{color: '#666'}}>Damaged:</span> <strong style={{color: '#d32f2f'}}>{eq.damaged}</strong></div>
                                      <div><span style={{color: '#666'}}>Maintenance:</span> <strong style={{color: '#f57c00'}}>{eq.maintenance_needed}</strong></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{color: '#999', textAlign: 'center', padding: '20px'}}>No equipment health data available</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Demand Forecast Section */}
                    {demandForecast && demandForecast.forecast && (
                      <div style={{background: '#f0f9ff', padding: '20px', borderRadius: '8px', border: '1px solid #b3e5fc', marginBottom: '30px'}}>
                        <h4 style={{marginTop: 0, marginBottom: '12px', fontSize: '1rem', fontWeight: '600', color: '#01579b'}}>📊 7-Day Demand Forecast</h4>
                        <p style={{color: '#555', fontSize: '0.9rem', marginBottom: '16px'}}>Predicted reservation demand for the next week</p>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px'}}>
                          {demandForecast.forecast.map((day, idx) => (
                            <div key={idx} style={{background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e0f2f1', textAlign: 'center'}}>
                              <div style={{fontSize: '0.85rem', fontWeight: '600', color: '#333', marginBottom: '6px'}}>{day.day_name}</div>
                              <div style={{fontSize: '0.85rem', color: '#666', marginBottom: '8px'}}>{new Date(day.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
                              <div style={{display: 'inline-block', padding: '6px 10px', borderRadius: '4px', backgroundColor: day.predicted_demand > 2 ? '#ffebee' : day.predicted_demand > 0 ? '#f3e5f5' : '#e8f5e9', color: day.predicted_demand > 2 ? '#c62828' : day.predicted_demand > 0 ? '#6a1b9a' : '#2e7d32', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px'}}>
                                {day.predicted_demand} {day.predicted_demand === 1 ? 'booking' : 'bookings'}
                              </div>
                              <div style={{fontSize: '0.75rem', color: '#999'}}>{day.confidence} confidence</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations Section */}
                    {recommendations && recommendations.length > 0 && (
                      <div style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '1px solid #ffe0b2'}}>
                        <h4 style={{marginTop: 0, marginBottom: '16px', fontSize: '1rem', fontWeight: '600', color: '#e65100'}}>💡 Actionable Recommendations</h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                          {recommendations.map((rec, idx) => (
                            <div key={idx} style={{background: '#fff', padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${rec.priority === 'High' ? '#d32f2f' : '#f57c00'}`}}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px'}}>
                                <div style={{fontWeight: '600', fontSize: '0.95rem', color: '#333'}}>{rec.title}</div>
                                <span style={{background: rec.priority === 'High' ? '#d32f2f' : '#f57c00', color: '#fff', padding: '2px 8px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: '600'}}>{rec.priority}</span>
                              </div>
                              <p style={{margin: '6px 0', color: '#666', fontSize: '0.9rem'}}>{rec.description}</p>
                              <div style={{padding: '6px 10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85rem', color: '#555', fontStyle: 'italic'}}>✓ {rec.action}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="admin-section" key={activeTab}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{margin: 0}}>Manage Rooms</h2>
                <button 
                  className="btn-add-equipment" // reuse style for consistency
                  onClick={() => setShowAddRoomModal(true)}
                >
                  + ADD ROOM
                </button>
              </div>

              {addRoomSuccess && (
                <div style={{marginBottom: '16px'}}>
                  <div style={{display: 'inline-block', padding: '10px 14px', backgroundColor: '#e6ffed', color: '#0b6b2f', borderRadius: '6px', fontWeight: 600}}>
                    Room added successfully!
                  </div>
                </div>
              )}

              {updateRoomSuccess && (
                <div style={{marginBottom: '16px'}}>
                  <div style={{display: 'inline-block', padding: '10px 14px', backgroundColor: '#e6ffed', color: '#0b6b2f', borderRadius: '6px', fontWeight: 600}}>
                    Room updated successfully!
                  </div>
                </div>
              )}

              {rooms.length === 0 ? (
                <p>No rooms registered yet</p>
              ) : (
                <div className="equipment-table-container">
                  <table className="equipment-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Room Name</th>
                        <th>Image</th>
                        <th>Status</th>
                        <th>Date Added</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(room => (
                        <tr key={room.id}>
                          <td>{room.id}</td>
                          <td>{room.name}</td>
                          <td>
                            {room.image ? (
                              <img 
                                src={room.image} 
                                alt={room.name}
                                style={{maxWidth: '50px', maxHeight: '50px', borderRadius: '4px'}}
                              />
                            ) : (
                              <span style={{color: '#999', fontSize: '0.9rem'}}>No image</span>
                            )}
                          </td>
                          <td>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: room.available ? '#d4edda' : '#f8d7da',
                              color: room.available ? '#155724' : '#721c24',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleRoomAvailability(room)}
                            title="Click to toggle availability"
                            >
                              {room.available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td>{formatDate(room.created_at)}</td>
                          <td>
                            <button
                              className="btn-edit-equipment"
                              onClick={() => handleEditRoom(room)}
                              style={{marginRight: '8px'}}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete-equipment"
                              onClick={() => handleDeleteRoom(room.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="admin-section" key={activeTab}>
              <h2>Reservations</h2>
              {approveSuccessMsg && (
                <div className="approval-banner" role="status" style={{marginBottom: '12px'}}>
                  {approveSuccessMsg}
                </div>
              )}
              {rejectSuccessMsg && (
                <div className="rejection-banner" role="status" style={{marginBottom: '12px'}}>
                  {rejectSuccessMsg}
                </div>
              )}
              {deleteSuccessMsg && (
                <div className="approval-banner" role="status" style={{marginBottom: '12px'}}>
                  {deleteSuccessMsg}
                </div>
              )}
              {returnSuccessMessage && (
                <div className="approval-banner" role="status" style={{marginBottom: '12px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb'}}>
                  {returnSuccessMessage}
                </div>
              )}

              <>
                <div style={{display: 'flex', gap: '12px', marginBottom: '16px'}}>
                    <button
                      className={`dept-tab ${reservationsFilter === 'equipment' ? 'active' : ''}`}
                      onClick={() => setReservationsFilter('equipment')}
                    >
                      Equipment ({reservations.filter(r => r.item_type === 'equipment').length})
                    </button>
                    <button
                      className={`dept-tab ${reservationsFilter === 'room' ? 'active' : ''}`}
                      onClick={() => setReservationsFilter('room')}
                    >
                      Rooms ({reservations.filter(r => r.item_type === 'room').length})
                    </button>
                  </div>

                  {reservations.filter(r => r.item_type === reservationsFilter).length === 0 ? (
                    <p>No {reservationsFilter} reservations found.</p>
                  ) : (
                    <div className="reservations-table-container">
                      <table className="equipment-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>{reservationsFilter === 'room' ? 'Room Name' : 'Item Name'}</th>
                            <th>Fullname</th>
                            {reservationsFilter === 'equipment' && <th>Department</th>}
                            <th>Date Needed</th>
                            <th>Time Needed</th>
                            <th>Purpose</th>
                            <th>Status</th>
                            <th>Approved By</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservations.filter(r => r.item_type === reservationsFilter).map(r => {
                            let itemName = r.item_name || r.itemName || '';
                            if (r.item_type === 'equipment') {
                              const found = equipment.find(e => String(e.id) === String(r.item_id));
                              if (found) {
                                itemName = found.name || itemName;
                              }
                            } else if (r.item_type === 'room') {
                              const foundR = rooms.find(rr => String(rr.id) === String(r.item_id));
                              if (foundR) itemName = foundR.name || itemName;
                            }

                            // Resolve reserver: Use nested user object from API response first
                            let reserver = null;
                            // Try to get user from API response (highest priority)
                            if (r.user && typeof r.user === 'object' && r.user.id) {
                              reserver = r.user;
                            } else if (r.requester && typeof r.requester === 'object') {
                              reserver = r.requester;
                            } else if (r.requested_by && typeof r.requested_by === 'object') {
                              reserver = r.requested_by;
                            } else {
                              // fallback to resolving from users list
                              if (r.user_id != null) {
                                reserver = users.find(u => String(u.id) === String(r.user_id));
                              }
                              if (!reserver && (r.user_email || r.email)) {
                                reserver = users.find(u => String(u.email).toLowerCase() === String(r.user_email || r.email).toLowerCase());
                              }
                              if (!reserver && (r.id_number || r.user_id_number)) {
                                reserver = users.find(u => String(u.id_number) === String(r.id_number || r.user_id_number));
                              }
                            }

                            // Determine fullname and department from whatever we found
                            let fullname = '-';
                            let department = '-';
                            if (reserver) {
                              fullname = reserver.fullname || reserver.full_name || reserver.name || reserver.user_name || reserver.email || '-';
                              department = reserver.department || reserver.dept || reserver.user_department || '-';
                            } else {
                              fullname = r.user_name || r.user_fullname || r.fullname || r.user || r.user_email || `User #${r.user_id || 'unknown'}`;
                              department = r.department || r.user_department || r.dept || '-';
                            }

                            // Time label: equipments should display single time (what admin entered). Rooms show range.
                            let timeLabel = '';
                            if (r.item_type === 'equipment') {
                              const t = r.time_needed || r.timeNeeded || r.time_from || r.timeFrom || r.time;
                              timeLabel = t ? formatTimeWithAMPM(t) : '';
                            } else {
                              const start = r.time_from || r.timeFrom || r.time_needed || r.timeNeeded;
                              const end = r.time_to || r.timeTo || r.timeNeeded;
                              if (start && end) {
                                timeLabel = `${formatTimeWithAMPM(start)} to ${formatTimeWithAMPM(end)}`;
                              } else {
                                const t = r.time_needed || r.timeNeeded || start || '';
                                timeLabel = t ? formatTimeWithAMPM(t) : '';
                              }
                            }

                            return (
                              <tr key={r.id}>
                                <td>{r.id}</td>
                                <td>{itemName}</td>
                                <td>{fullname}</td>
                                {reservationsFilter === 'equipment' && <td>{department}</td>}
                                <td>{r.date_needed || r.dateNeeded}</td>
                                <td>{timeLabel}</td>
                                <td>{r.purpose}</td>
                                <td>
                                  {(() => {
                                    const raw = (r.status || 'pending').toString().toLowerCase();
                                    const key = (raw === 'confirmed' || raw === 'approved') ? 'approved' : raw;
                                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                                    return (
                                      <span className={`status-label status-${key}`}>{label}</span>
                                    );
                                  })()}
                                </td>
                                <td>
                                  {r.approved_by_name || r.approvedByName || '-'}
                                </td>
                                <td>
                                  <div className="action-buttons-cell">
                                    <button 
                                      className="icon-button icon-button-view" 
                                      onClick={() => handleViewReservationAdmin(r.id)}
                                      title="View Details"
                                    >
                                      👁
                                    </button>
                                    {(() => {
                                      const raw = (r.status || 'pending').toString().toLowerCase();
                                      const isApproved = (raw === 'confirmed' || raw === 'approved');
                                      
                                      if (isApproved) {
                                        // Show return button for approved equipment reservations, delete for rooms
                                        return (
                                          <>
                                            {r.item_type === 'equipment' && (
                                              <button 
                                                className="icon-button icon-button-return" 
                                                onClick={() => {
                                                  setReturnReservationId(r.id);
                                                  setShowReturnModal(true);
                                                }}
                                                title="Mark as Returned"
                                              >
                                                ↩️
                                              </button>
                                            )}
                                            {r.item_type === 'room' && (
                                              <button 
                                                className="icon-button icon-button-delete" 
                                                onClick={() => {
                                                  setDeleteReservationId(r.id);
                                                  setShowDeleteModal(true);
                                                }}
                                                title="Delete Reservation"
                                              >
                                                🗑
                                              </button>
                                            )}
                                          </>
                                        );
                                      } else {
                                        // Show reject and approve buttons for pending reservations
                                        return (
                                          <>
                                            <button 
                                              className="icon-button icon-button-deny" 
                                              onClick={() => openRejectModal(r.id)}
                                              title="Reject Reservation"
                                            >
                                              ✕
                                            </button>
                                            <button 
                                              className="icon-button icon-button-approve" 
                                              onClick={() => { setApproveReservationId(r.id); setShowApproveModal(true); setApproverName(''); }}
                                              title="Approve Reservation"
                                            >
                                              ✓
                                            </button>
                                          </>
                                        );
                                      }
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
            </div>
          )}
        </div>
      </div>

      {/* Edit Equipment Modal */}
      {/* View Reservation Modal */}
      {showViewModal && viewReservation && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '720px'}}>
            <div style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
              <div style={{flex: '0 0 260px'}}>
                {viewReservation.image ? (
                  <div style={{width: '100%', height: '260px', overflow: 'hidden', borderRadius: '12px', background: '#f4f4f4'}}>
                    <img src={viewReservation.image} alt={viewReservation.itemName} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  </div>
                ) : (
                  <div style={{width: '100%', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: '#f8f8f8', color: '#999'}}>
                    No image available
                  </div>
                )}
              </div>
              <div style={{flex: 1}}>
                <h3 style={{marginTop: 0}}>Reservation #{viewReservation.id}</h3>
                <p style={{margin: '8px 0'}}><strong>Item:</strong> {viewReservation.itemName}</p>
                {viewReservation.itemNumber && (
                  <p style={{margin: '8px 0'}}><strong>Item Number:</strong> {viewReservation.itemNumber}</p>
                )}
                <p style={{margin: '8px 0'}}><strong>Requested by:</strong> {viewReservation.fullname}</p>
                <p style={{margin: '8px 0'}}><strong>Department:</strong> {viewReservation.department}</p>
                <p style={{margin: '8px 0'}}><strong>Date Needed:</strong> {viewReservation.date_needed}</p>
                <p style={{margin: '8px 0'}}><strong>Time:</strong> {viewReservation.timeLabel}</p>
                <p style={{margin: '8px 0'}}><strong>Purpose:</strong> {viewReservation.purpose}</p>
                <p style={{margin: '8px 0'}}>
                  <strong>Status:</strong>{' '}
                  {(() => {
                    const raw = (viewReservation.status || 'pending').toString().toLowerCase();
                    const key = (raw === 'confirmed' || raw === 'approved') ? 'approved' : raw;
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    return <span className={`status-label status-${key}`}>{label}</span>;
                  })()}
                </p>
              </div>
            </div>
            <div className="modal-buttons" style={{marginTop: '18px'}}>
              <button className="btn-cancel" onClick={() => setShowViewModal(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
      {/* Reject Decision Modal */}
      {showRejectModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '600px'}}>
            <h3>Reject Reservation</h3>
            <p>Please provide a reason for rejecting this reservation. This will be recorded.</p>
            <div style={{marginBottom: '16px'}}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="equipment-input"
                style={{minHeight: '120px'}}
              />
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>CANCEL</button>
              <button className="btn-confirm" onClick={confirmRejectReservation}>REJECT</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteReservationId && (
        <div className="admin-modal-overlay">
          <div className="admin-modal delete-modal" style={{maxWidth: '480px'}}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this reservation?</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => { setShowDeleteModal(false); setDeleteReservationId(null); }}>NO</button>
              <button className="btn-confirm" onClick={confirmDeleteReservation}>YES</button>
            </div>
          </div>
        </div>
      )}
      {/* Approve Confirmation Modal */}
      {showApproveModal && approveReservationId && (
        <div className="admin-modal-overlay">
          <div className="admin-modal approve-modal" style={{maxWidth: '480px'}}>
            <h3>Confirm Approval</h3>
            <p>Are you sure you want to approve this reservation?</p>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Approver Name</label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Enter your name"
                className="equipment-input"
              />
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => { 
                setShowApproveModal(false); 
                setApproveReservationId(null);
                setApproverName('');
              }}>CANCEL</button>
              <button 
                className="btn-confirm" 
                disabled={!approverName.trim()}
                style={{opacity: !approverName.trim() ? 0.5 : 1, cursor: !approverName.trim() ? 'not-allowed' : 'pointer'}}
                onClick={async () => {
                  const id = approveReservationId;
                  setShowApproveModal(false);
                  setApproveReservationId(null);
                  await handleApproveReservation(id);
                  setApproverName('');
                }}>YES</button>
            </div>
          </div>
        </div>
      )}
      {/* Equipment Return Modal */}
      {showReturnModal && returnReservationId && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '600px'}}>
            <h3>Mark Equipment as Returned</h3>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Condition</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="equipment-input"
              >
                <option value="good">✓ Good Condition</option>
                <option value="damaged">⚠️ Damaged</option>
                <option value="maintenance">🔧 Needs Maintenance</option>
              </select>
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Admin Remarks</label>
              <textarea
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder="e.g., Speaker has crackling sound. Needs amplifier check."
                className="equipment-input"
                style={{minHeight: '100px'}}
              />
            </div>
            <div className="modal-buttons">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReservationId(null);
                  setReturnCondition('good');
                  setReturnRemarks('');
                }}
                disabled={returnLoading}
              >
                CANCEL
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleEquipmentReturn}
                disabled={returnLoading}
                style={{opacity: returnLoading ? 0.5 : 1, cursor: returnLoading ? 'not-allowed' : 'pointer'}}
              >
                {returnLoading ? 'PROCESSING...' : 'MARK RETURNED'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Reservation Modal */}
      {showEditReservationModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '600px'}}>
            <h3>Edit Reservation</h3>
            {editReservationError && (
              <div style={{
                padding: '10px 12px',
                marginBottom: '16px',
                backgroundColor: '#ffe0e0',
                color: '#cc0000',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: '1px solid #ff9999'
              }}>
                {editReservationError}
              </div>
            )}
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Date</label>
              <input
                type="date"
                value={editReservationData.date_needed}
                onChange={(e) => setEditReservationData({...editReservationData, date_needed: e.target.value})}
                className="equipment-input"
              />
            </div>
            {editReservationData.item_type === 'room' && (
              <>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Start Time</label>
                  <input
                    type="time"
                    value={editReservationData.time_from}
                    onChange={(e) => setEditReservationData({...editReservationData, time_from: e.target.value})}
                    className="equipment-input"
                  />
                </div>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>End Time</label>
                  <input
                    type="time"
                    value={editReservationData.time_to}
                    onChange={(e) => setEditReservationData({...editReservationData, time_to: e.target.value})}
                    className="equipment-input"
                  />
                </div>
              </>
            )}
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Purpose</label>
              <textarea
                value={editReservationData.purpose}
                onChange={(e) => setEditReservationData({...editReservationData, purpose: e.target.value})}
                className="equipment-input"
                style={{minHeight: '80px'}}
              />
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => { 
                setShowEditReservationModal(false); 
                setEditReservationError('');
              }}>CANCEL</button>
              <button className="btn-confirm" onClick={handleSaveEditReservation}>SAVE</button>
            </div>
          </div>
        </div>
      )}
      {showEditEquipmentModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal edit-equipment-modal">
            <h3>Edit Equipment</h3>
            <div className="edit-equipment-grid">
              <div className="edit-equipment-left">
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Item Name</label>
                  <select
                    value={editEquipmentData.name}
                    onChange={(e) => setEditEquipmentData({...editEquipmentData, name: e.target.value})}
                    className="equipment-input"
                  >
                    <option value="">Select Item Name</option>
                    {ITEM_NAMES.filter(name => name !== 'Other (Custom)').map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {dynamicItemNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="Other (Custom)">Other (Custom)</option>
                  </select>
                </div>
                {editEquipmentData.name === 'Other (Custom)' && (
                  <div style={{marginBottom: '20px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Custom Equipment Name</label>
                    <input
                      type="text"
                      value={editEquipmentData.customName}
                      onChange={(e) => setEditEquipmentData({...editEquipmentData, customName: e.target.value})}
                      className="equipment-input"
                      placeholder="e.g., Monitor, Keyboard, Mouse, etc."
                    />
                  </div>
                )}
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Item Number</label>
                  <input
                    type="text"
                    value={editEquipmentData.item_number}
                    onChange={(e) => setEditEquipmentData({...editEquipmentData, item_number: e.target.value})}
                    className="equipment-input"
                    placeholder="e.g., SPEAKER-001"
                  />
                </div>
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Status</label>
                  <select
                    value={editEquipmentData.status}
                    onChange={(e) => setEditEquipmentData({...editEquipmentData, status: e.target.value})}
                    className="equipment-input"
                  >
                    {EQUIPMENT_STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-buttons edit-equipment-actions">
                  <button 
                    className="btn-cancel" 
                    onClick={() => setShowEditEquipmentModal(false)}
                  >
                    CANCEL
                  </button>
                  <button 
                    className="btn-confirm" 
                    onClick={handleSaveEquipment}
                  >
                    UPDATE EQUIPMENT
                  </button>
                </div>
              </div>
              <div className="edit-equipment-right">
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Image</label>
                  {editEquipmentData.imagePreview && (
                    <div className="edit-equipment-image">
                      <img 
                        src={editEquipmentData.imagePreview} 
                        alt="Preview" 
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditEquipmentData({
                            ...editEquipmentData,
                            image: file,
                            imagePreview: event.target.result
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="equipment-input"
                    style={{padding: '8px'}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditRoomModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '500px'}}>
            <h3>Edit Room</h3>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Room Name</label>
              <input
                type="text"
                value={editRoomData.name}
                onChange={(e) => setEditRoomData({...editRoomData, name: e.target.value})}
                className="equipment-input"
              />
            </div>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Image</label>
              {editRoomData.imagePreview && (
                <div style={{marginBottom: '10px', textAlign: 'center', width: '100%', height: '300px', background: '#eee', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
                  <img 
                    src={editRoomData.imagePreview} 
                    alt="Preview" 
                    style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px'}}
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setEditRoomData({
                        ...editRoomData,
                        image: file,
                        imagePreview: event.target.result
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="equipment-input"
                style={{padding: '8px'}}
              />
            </div>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Status</label>
              <select
                value={editRoomData.available ? 'available' : 'not-available'}
                onChange={(e) => setEditRoomData({...editRoomData, available: e.target.value === 'available'})}
                className="equipment-input"
              >
                <option value="available">Available</option>
                <option value="not-available">Not Available</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button 
                className="btn-cancel" 
                onClick={() => setShowEditRoomModal(false)}
              >
                CANCEL
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleSaveRoom}
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '600px'}}>
            <h3>Edit User</h3>
            {editUserError && (
              <div style={{
                padding: '10px 12px',
                marginBottom: '16px',
                backgroundColor: '#ffe0e0',
                color: '#cc0000',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: '1px solid #ff9999'
              }}>
                {editUserError}
              </div>
            )}
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Full Name</label>
              <input
                type="text"
                value={editUserData.fullname}
                onChange={(e) => setEditUserData({...editUserData, fullname: e.target.value})}
                className="equipment-input"
              />
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Email</label>
              <input
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                className="equipment-input"
              />
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>ID Number</label>
              <input
                type="text"
                value={editUserData.id_number}
                onChange={(e) => setEditUserData({...editUserData, id_number: e.target.value})}
                className="equipment-input"
              />
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Department</label>
              <input
                type="text"
                value={editUserData.department}
                onChange={(e) => setEditUserData({...editUserData, department: e.target.value})}
                className="equipment-input"
              />
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Sub (Optional)</label>
              <input
                type="text"
                value={editUserData.sub}
                onChange={(e) => setEditUserData({...editUserData, sub: e.target.value})}
                className="equipment-input"
                placeholder="e.g., (if any)"
              />
            </div>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditUserError('');
                }}
              >
                CANCEL
              </button>
              <button className="btn-confirm" onClick={handleSaveEditUser}>
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="regform-modal-bg">
          <div className="regform-modal">
            <h2 className="regform-title">Add New User</h2>

            {addUserError && (
              <div style={{color: '#c53030', fontSize: '0.9rem', marginBottom: 10, padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '3px solid #c53030'}}>
                {addUserError}
              </div>
            )}
            {addUserSuccess && (
              <div style={{color: '#276749', fontSize: '0.9rem', marginBottom: 10, padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #276749'}}>
                User added successfully!
              </div>
            )}

            <form className="regform-form" onSubmit={(e) => { e.preventDefault(); handleAddUser(); }}>
              <label>FULLNAME
                <input
                  type="text"
                  value={addUserData.fullname}
                  onChange={e => setAddUserData({...addUserData, fullname: e.target.value})}
                  className="regform-input"
                  placeholder=""
                />
              </label>
              <label>DOMAIN ACCOUNT
                <input
                  type="email"
                  value={addUserData.email}
                  onChange={e => setAddUserData({...addUserData, email: e.target.value})}
                  className="regform-input"
                  placeholder="name@shc.edu.ph"
                />
              </label>
              <label>ID NUMBER
                <input
                  type="text"
                  value={addUserData.id_number}
                  onChange={e => setAddUserData({...addUserData, id_number: e.target.value})}
                  className="regform-input"
                  placeholder=""
                />
              </label>
              <label>DEPARTMENT
                <select
                  className="form-select form-select-sm rounded-pill"
                  value={addUserData.department}
                  onChange={(e) => {
                    setAddUserData({
                      ...addUserData,
                      department: e.target.value,
                      sub: ''
                    });
                  }}
                >
                  <option value="">Select Department</option>
                  <option value="BED">BED</option>
                  <option value="HED">HED</option>
                  <option value="FACULTY">FACULTY</option>
                  <option value="NTP">NTP</option>
                </select>
              </label>

              {addUserData.department === 'BED' && (
                <div className="mb-2">
                  <label className="form-label">GRADE</label>
                  <select
                    className="form-select form-select-sm rounded-pill"
                    value={addUserData.sub}
                    onChange={e => setAddUserData({...addUserData, sub: e.target.value})}
                  >
                    <option value="">Select Grade Level</option>
                    <option>Grade 7</option>
                    <option>Grade 8</option>
                    <option>Grade 9</option>
                    <option>Grade 10</option>
                    <option>Grade 11</option>
                    <option>Grade 12</option>
                  </select>
                </div>
              )}

              {addUserData.department === 'HED' && (
                <div className="mb-2">
                  <label className="form-label">PROGRAM</label>
                  <select
                    className="form-select form-select-sm rounded-pill"
                    value={addUserData.sub}
                    onChange={e => setAddUserData({...addUserData, sub: e.target.value})}
                  >
                    <option value="">Select Course</option>
                    <option>BS Computer Science</option>
                    <option>BS Business Administration</option>
                    <option>BS Accountancy</option>
                    <option>BS Management Accounting</option>
                    <option>BS Social Work</option>
                    <option>BS Ab Communication</option>
                    <option>BS Psychology</option>
                    <option>BS Teacher Education</option>
                    <option>BS Nursing</option>
                    <option>BS Pharmacy</option>
                  </select>
                </div>
              )}

              <label>PASSWORD
                <input
                  type="password"
                  value={addUserData.password}
                  onChange={e => setAddUserData({...addUserData, password: e.target.value})}
                  className="regform-input"
                />
              </label>
              <label>CONFIRM PASSWORD
                <input
                  type="password"
                  value={addUserData.confirmPassword}
                  onChange={e => setAddUserData({...addUserData, confirmPassword: e.target.value})}
                  className="regform-input"
                />
              </label>

              <button type="submit" className="regform-btn" disabled={addUserSuccess}>
                {addUserSuccess ? 'Added' : 'Add User'}
              </button>
            </form>

            <button className="regform-close" onClick={() => { setShowAddUserModal(false); setAddUserError(''); }}>
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserModal && deleteUserId && (
        <div className="admin-modal-overlay">
          <div className="admin-modal delete-modal" style={{maxWidth: '480px'}}>
            <h3>Delete User{deleteUserName ? `: ${deleteUserName}` : ''}</h3>
            {deleteUserError && (
              <div style={{
                padding: '10px 12px',
                marginBottom: '16px',
                backgroundColor: '#ffe0e0',
                color: '#cc0000',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: '1px solid #ff9999'
              }}>
                {deleteUserError}
              </div>
            )}
            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setDeleteUserId(null);
                  setDeleteUserName('');
                  setDeleteUserError('');
                }}
              >
                NO
              </button>
              <button className="btn-confirm" onClick={confirmDeleteUser}>
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion confirmation modal for either equipment or room */}
      {showDeleteConfirmModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setEquipmentToDelete(null);
                  setRoomToDelete(null);
                }}
              >
                CANCEL
              </button>
              <button 
                className="btn-confirm" 
                onClick={() => {
                  if (roomToDelete) {
                    confirmDeleteRoom();
                  } else {
                    confirmDeleteEquipment();
                  }
                }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal edit-equipment-modal">
            <h3>Add New Equipment</h3>
            <div className="edit-equipment-grid">
              <div className="edit-equipment-left">
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Item Name</label>
                  <select
                    value={newEquipment.name}
                    onChange={(e) => handleItemNameChange(e.target.value)}
                    className="equipment-input"
                  >
                    <option value="">Select Item Name</option>
                    {ITEM_NAMES.filter(name => name !== 'Other (Custom)').map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {dynamicItemNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="Other (Custom)">Other (Custom)</option>
                  </select>
                </div>
                {newEquipment.name === 'Other (Custom)' && (
                  <div style={{marginBottom: '20px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Custom Equipment Name</label>
                    <input
                      type="text"
                      value={newEquipment.customName}
                      onChange={(e) => setNewEquipment({...newEquipment, customName: e.target.value})}
                      className="equipment-input"
                      placeholder="e.g., Monitor, Keyboard, Mouse, etc."
                    />
                  </div>
                )}
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Item Number</label>
                  <input
                    type="text"
                    value={newEquipment.item_number}
                    onChange={(e) => setNewEquipment({...newEquipment, item_number: e.target.value})}
                    className="equipment-input"
                    placeholder="e.g., SPEAKER-001"
                  />
                </div>
              </div>
              <div className="edit-equipment-right">
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Image</label>
                  {newEquipment.imagePreview && (
                    <div className="edit-equipment-image">
                      <img 
                        src={newEquipment.imagePreview} 
                        alt="Preview" 
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setNewEquipment({
                            ...newEquipment,
                            image: file,
                            imagePreview: event.target.result
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="equipment-input"
                    style={{padding: '8px'}}
                  />
                </div>
                <div style={{marginBottom: '0px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Status</label>
                  <select
                    value={newEquipment.status}
                    onChange={(e) => setNewEquipment({...newEquipment, status: e.target.value})}
                    className="equipment-input"
                  >
                    {EQUIPMENT_STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-buttons edit-equipment-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowAddEquipmentModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleAddEquipment}
              >
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '500px'}}>
            <h3>Add New Room</h3>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Room Name</label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                className="equipment-input"
                placeholder="e.g., Room 213"
              />
            </div>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>Image</label>
              {newRoom.imagePreview && (
                <div style={{marginBottom: '10px', textAlign: 'center', width: '100%', height: '300px', background: '#eee', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
                  <img 
                    src={newRoom.imagePreview} 
                    alt="Preview" 
                    style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px'}}
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setNewRoom({
                        ...newRoom,
                        image: file,
                        imagePreview: event.target.result
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="equipment-input"
                style={{padding: '8px'}}
              />
            </div>
            <div className="modal-buttons">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowAddRoomModal(false);
                  setNewRoom({ name: '', image: null, imagePreview: null });
                  setAddRoomSuccess(false);
                }}
              >
                CANCEL
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleAddRoom}
              >
                ADD ROOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth: '500px'}}>
            <h3>Bulk Update Equipment Status</h3>
            <p style={{color: '#666', marginBottom: '16px'}}>
              You are about to update the status of <strong>{selectedInventoryItems.size} equipment items</strong>.
            </p>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem'}}>New Status</label>
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className="equipment-input"
              >
                <option value="Available">Available</option>
                <option value="Not Available">Not Available</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="For Repair">For Repair</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowBulkStatusModal(false);
                  setBulkStatusValue('Available');
                }}
              >
                CANCEL
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleBulkStatusUpdate}
              >
                UPDATE ALL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-buttons">
              <button 
                className="btn-cancel" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
