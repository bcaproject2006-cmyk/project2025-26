// pages/StaffManagement.jsx
import React, { useState } from 'react';
import './StaffManagement.css';

const StaffManagement = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sample staff data
  const staffData = {
    overview: [
      { title: 'Total Staff', value: '48', change: '+12.5%', icon: '👥', color: '#3498db' },
      { title: 'Active Staff', value: '42', change: '+8.2%', icon: '✅', color: '#27ae60' },
      { title: 'On Leave', value: '4', change: '-15.3%', icon: '🏖️', color: '#f39c12' },
      { title: 'New Hires', value: '6', change: '+22.1%', icon: '🆕', color: '#9b59b6' },
      { title: 'Attendance Rate', value: '94.7%', change: '+1.2%', icon: '📊', color: '#e74c3c' },
    ],
    
    staffMembers: {
      active: [
        { 
          id: 'EMP-001', 
          name: 'John Smith', 
          role: 'Store Manager', 
          email: 'john.s@freshbasket.com', 
          phone: '+1 (555) 123-4567', 
          department: 'Operations', 
          joinDate: '2022-03-15', 
          status: 'active',
          shifts: 'Morning (8AM-4PM)',
          performance: 4.8,
          avatarColor: '#3498db'
        },
        { 
          id: 'EMP-002', 
          name: 'Sarah Johnson', 
          role: 'Cashier Lead', 
          email: 'sarah.j@freshbasket.com', 
          phone: '+1 (555) 234-5678', 
          department: 'Sales', 
          joinDate: '2023-01-20', 
          status: 'active',
          shifts: 'Afternoon (12PM-8PM)',
          performance: 4.5,
          avatarColor: '#27ae60'
        },
        { 
          id: 'EMP-003', 
          name: 'Mike Chen', 
          role: 'Inventory Specialist', 
          email: 'mike.c@freshbasket.com', 
          phone: '+1 (555) 345-6789', 
          department: 'Inventory', 
          joinDate: '2021-11-05', 
          status: 'active',
          shifts: 'Morning (6AM-2PM)',
          performance: 4.9,
          avatarColor: '#f39c12'
        },
        { 
          id: 'EMP-004', 
          name: 'Lisa Rodriguez', 
          role: 'Customer Service', 
          email: 'lisa.r@freshbasket.com', 
          phone: '+1 (555) 456-7890', 
          department: 'Customer Service', 
          joinDate: '2023-06-10', 
          status: 'active',
          shifts: 'Evening (4PM-12AM)',
          performance: 4.2,
          avatarColor: '#9b59b6'
        },
        { 
          id: 'EMP-005', 
          name: 'David Wilson', 
          role: 'Assistant Manager', 
          email: 'david.w@freshbasket.com', 
          phone: '+1 (555) 567-8901', 
          department: 'Operations', 
          joinDate: '2020-08-22', 
          status: 'active',
          shifts: 'Variable',
          performance: 4.7,
          avatarColor: '#e74c3c'
        },
      ],
      onLeave: [
        { 
          id: 'EMP-101', 
          name: 'Robert Kim', 
          role: 'Stock Clerk', 
          email: 'robert.k@freshbasket.com', 
          phone: '+1 (555) 678-9012', 
          department: 'Inventory', 
          joinDate: '2023-03-18', 
          status: 'onLeave',
          leaveType: 'Vacation',
          leaveUntil: '2024-06-30',
          avatarColor: '#1abc9c'
        },
      ],
      terminated: [
        { 
          id: 'EMP-201', 
          name: 'Emma Davis', 
          role: 'Cashier', 
          email: 'emma.d@freshbasket.com', 
          phone: '+1 (555) 789-0123', 
          department: 'Sales', 
          joinDate: '2023-09-15', 
          status: 'terminated',
          terminationDate: '2024-05-20',
          reason: 'Resigned',
          avatarColor: '#95a5a6'
        },
      ]
    },
    
    departments: [
      { name: 'Operations', staffCount: 15, color: '#3498db' },
      { name: 'Sales', staffCount: 12, color: '#27ae60' },
      { name: 'Inventory', staffCount: 8, color: '#f39c12' },
      { name: 'Customer Service', staffCount: 7, color: '#9b59b6' },
      { name: 'Administration', staffCount: 6, color: '#e74c3c' },
    ],
    
    recentActivities: [
      { user: 'John Smith', action: 'Checked in', time: '08:00 AM', date: 'Today' },
      { user: 'Sarah Johnson', action: 'Processed order #1001', time: '09:15 AM', date: 'Today' },
      { user: 'Mike Chen', action: 'Updated inventory', time: '10:30 AM', date: 'Today' },
      { user: 'Admin', action: 'Added new staff member', time: 'Yesterday', date: '2024-06-14' },
      { user: 'System', action: 'Generated payroll report', time: 'Yesterday', date: '2024-06-14' },
    ],
    
    upcomingLeaves: [
      { staff: 'Lisa Rodriguez', type: 'Vacation', from: '2024-06-20', to: '2024-06-25', status: 'approved' },
      { staff: 'David Wilson', type: 'Sick Leave', from: '2024-06-22', to: '2024-06-23', status: 'pending' },
      { staff: 'Mike Chen', type: 'Training', from: '2024-06-28', to: '2024-06-29', status: 'approved' },
    ],
  };

  // New staff form state
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    joinDate: '',
    shift: 'morning',
    salary: '',
  });

  // Filter staff based on search and active tab
  const filteredStaff = () => {
    const staffList = staffData.staffMembers[activeTab] || [];
    
    if (!searchTerm.trim()) return staffList;
    
    return staffList.filter(staff => 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStaff({
      ...newStaff,
      [name]: value
    });
  };

  const handleAddStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !newStaff.role) {
      alert('Please fill in required fields');
      return;
    }
    
    const fullName = `${newStaff.firstName} ${newStaff.lastName}`;
    alert(`New staff member "${fullName}" added!`);
    
    setNewStaff({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      department: '',
      joinDate: '',
      shift: 'morning',
      salary: '',
    });
  };

  const handleAction = (staffId, action) => {
    alert(`${action} action triggered for staff ID: ${staffId}`);
  };

  const calculateAveragePerformance = () => {
    const activeStaff = staffData.staffMembers.active || [];
    if (activeStaff.length === 0) return '0.0';
    
    const total = activeStaff.reduce((sum, staff) => sum + staff.performance, 0);
    return (total / activeStaff.length).toFixed(1);
  };

  return (
    <div className="staff-management">
      {/* Header */}
      <div className="staff-header">
        <div className="header-left">
          <h1><i className="fas fa-users-cog"></i> User & Staff Management</h1>
          <p>Manage staff profiles, roles, schedules, and permissions</p>
        </div>
        <div className="header-right">
          <div className="search-container">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search staff by name, role, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="export-btn">
            <i className="fas fa-download"></i> Export Roster
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="staff-overview">
        {staffData.overview.map((item, index) => (
          <div className="staff-card" key={index} style={{ borderLeftColor: item.color }}>
            <div className="staff-card-icon" style={{ background: `${item.color}20`, color: item.color }}>
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
            </div>
            <div className="staff-card-content">
              <h3>{item.title}</h3>
              <div className="staff-card-value">{item.value}</div>
              <div className="staff-card-change" style={{ color: item.change.startsWith('+') ? '#27ae60' : '#e74c3c' }}>
                <i className={`fas fa-${item.change.startsWith('+') ? 'arrow-up' : 'arrow-down'}`}></i>
                {item.change}
                <span className="time-label"> vs. last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="staff-grid">
        {/* Add New Staff Form */}
        <div className="add-staff-form">
          <div className="form-header">
            <h2><i className="fas fa-user-plus"></i> Add New Staff Member</h2>
          </div>
          <div className="form-content">
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={newStaff.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={newStaff.lastName}
                  onChange={handleInputChange}
                  placeholder="Smith"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={newStaff.email}
                onChange={handleInputChange}
                placeholder="john.smith@freshbasket.com"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={newStaff.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select name="role" value={newStaff.role} onChange={handleInputChange}>
                  <option value="">Select Role</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Assistant Manager">Assistant Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Cashier Lead">Cashier Lead</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                  <option value="Stock Clerk">Stock Clerk</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Cleaner">Cleaner</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <select name="department" value={newStaff.department} onChange={handleInputChange}>
                  <option value="">Select Department</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              <div className="form-group">
                <label>Shift Preference</label>
                <select name="shift" value={newStaff.shift} onChange={handleInputChange}>
                  <option value="morning">Morning (6AM-2PM)</option>
                  <option value="day">Day (8AM-4PM)</option>
                  <option value="afternoon">Afternoon (12PM-8PM)</option>
                  <option value="evening">Evening (4PM-12AM)</option>
                  <option value="night">Night (10PM-6AM)</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Join Date</label>
                <input
                  type="date"
                  name="joinDate"
                  value={newStaff.joinDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Monthly Salary ($)</label>
                <input
                  type="number"
                  name="salary"
                  value={newStaff.salary}
                  onChange={handleInputChange}
                  placeholder="e.g., 3500"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button className="btn-clear" onClick={() => setNewStaff({
                firstName: '', lastName: '', email: '', phone: '', role: '', 
                department: '', joinDate: '', shift: 'morning', salary: ''
              })}>
                <i className="fas fa-times"></i> Clear
              </button>
              <button className="btn-add" onClick={handleAddStaff}>
                <i className="fas fa-check"></i> Add Staff Member
              </button>
            </div>
          </div>
        </div>

        {/* Department Overview */}
        <div className="departments-card">
          <div className="card-header">
            <h2><i className="fas fa-building"></i> Department Overview</h2>
            <button className="manage-dept-btn">
              <i className="fas fa-cog"></i> Manage
            </button>
          </div>
          <div className="departments-list">
            {staffData.departments.map((dept, index) => (
              <div className="dept-item" key={index}>
                <div className="dept-header">
                  <div className="dept-info">
                    <h3>{dept.name}</h3>
                    <p className="dept-count">{dept.staffCount} staff members</p>
                  </div>
                  <div 
                    className="dept-color" 
                    style={{ backgroundColor: dept.color }}
                  ></div>
                </div>
                <div className="dept-progress">
                  <div 
                    className="progress-bar"
                    style={{ 
                      width: `${(dept.staffCount / 48) * 100}%`,
                      backgroundColor: dept.color
                    }}
                  ></div>
                </div>
                <div className="dept-roles">
                  <span className="role-tag">Manager</span>
                  <span className="role-tag">Supervisor</span>
                  <span className="role-tag">Staff</span>
                  {dept.name === 'Operations' && <span className="role-tag">Assistant</span>}
                </div>
              </div>
            ))}
          </div>
          
          <div className="performance-summary">
            <div className="performance-header">
              <h3>Overall Performance</h3>
              <span className="performance-score">{calculateAveragePerformance()}/5.0</span>
            </div>
            <div className="performance-stats">
              <div className="stat">
                <span className="stat-label">Excellent (4.5+)</span>
                <span className="stat-value">18</span>
              </div>
              <div className="stat">
                <span className="stat-label">Good (4.0-4.4)</span>
                <span className="stat-value">16</span>
              </div>
              <div className="stat">
                <span className="stat-label">Average (3.5-3.9)</span>
                <span className="stat-value">10</span>
              </div>
              <div className="stat">
                <span className="stat-label">Needs Improvement</span>
                <span className="stat-value">4</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Management Tabs */}
      <div className="staff-tabs-container">
        <div className="tabs-header">
          <h2><i className="fas fa-users"></i> Staff Directory</h2>
          <div className="tabs-navigation">
            <button 
              className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <i className="fas fa-user-check"></i> Active ({staffData.staffMembers.active?.length || 0})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'onLeave' ? 'active' : ''}`}
              onClick={() => setActiveTab('onLeave')}
            >
              <i className="fas fa-umbrella-beach"></i> On Leave ({staffData.staffMembers.onLeave?.length || 0})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'terminated' ? 'active' : ''}`}
              onClick={() => setActiveTab('terminated')}
            >
              <i className="fas fa-user-slash"></i> Terminated ({staffData.staffMembers.terminated?.length || 0})
            </button>
          </div>
        </div>

        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name & Role</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Performance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff().map((staff) => (
                <tr key={staff.id} className={`status-${staff.status}`}>
                  <td className="staff-id">{staff.id}</td>
                  <td>
                    <div className="staff-info">
                      <div 
                        className="staff-avatar"
                        style={{ backgroundColor: staff.avatarColor }}
                      >
                        {staff.name.charAt(0)}
                      </div>
                      <div className="staff-details">
                        <div className="staff-name">{staff.name}</div>
                        <div className="staff-role">{staff.role}</div>
                        <div className="staff-join-date">Since {staff.joinDate}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="contact-email">
                        <i className="fas fa-envelope"></i> {staff.email}
                      </div>
                      <div className="contact-phone">
                        <i className="fas fa-phone"></i> {staff.phone}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span 
                      className="dept-tag"
                      style={{ 
                        backgroundColor: `${staffData.departments.find(d => d.name === staff.department)?.color || '#718096'}20`,
                        color: staffData.departments.find(d => d.name === staff.department)?.color || '#718096'
                      }}
                    >
                      {staff.department}
                    </span>
                  </td>
                  <td className="staff-shift">{staff.shifts}</td>
                  <td>
                    {staff.performance ? (
                      <div className="performance-rating">
                        <div className="stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i 
                              key={star}
                              className={`fas fa-star ${star <= Math.floor(staff.performance) ? 'filled' : ''}`}
                            ></i>
                          ))}
                        </div>
                        <span className="rating-value">{staff.performance}/5.0</span>
                      </div>
                    ) : (
                      <span className="no-rating">Not rated</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${staff.status}`}>
                      {staff.status === 'active' && <i className="fas fa-circle"></i>}
                      {staff.status === 'onLeave' && <i className="fas fa-umbrella-beach"></i>}
                      {staff.status === 'terminated' && <i className="fas fa-user-slash"></i>}
                      {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                    </span>
                    {staff.leaveUntil && (
                      <div className="leave-info">
                        Returns: {staff.leaveUntil}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="staff-actions">
                      <button 
                        className="action-btn view-btn"
                        onClick={() => handleAction(staff.id, 'view')}
                        title="View Profile"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleAction(staff.id, 'edit')}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {staff.status === 'active' && (
                        <>
                          <button 
                            className="action-btn schedule-btn"
                            onClick={() => handleAction(staff.id, 'schedule')}
                            title="Schedule"
                          >
                            <i className="fas fa-calendar-alt"></i>
                          </button>
                          <button 
                            className="action-btn leave-btn"
                            onClick={() => handleAction(staff.id, 'leave')}
                            title="Leave Request"
                          >
                            <i className="fas fa-umbrella-beach"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredStaff().length === 0 && (
            <div className="empty-state">
              <i className="fas fa-user-slash"></i>
              <p>No staff members found. Try a different search or add new staff.</p>
            </div>
          )}
        </div>
      </div>

      <div className="staff-grid">
        {/* Recent Activities */}
        <div className="activities-card">
          <div className="card-header">
            <h2><i className="fas fa-history"></i> Recent Activities</h2>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="activities-list">
            {staffData.recentActivities.map((activity, index) => (
              <div className="activity-item" key={index}>
                <div className="activity-avatar">
                  {activity.user === 'Admin' ? 'A' : 
                   activity.user === 'System' ? 'S' : activity.user.charAt(0)}
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <strong>{activity.user}</strong>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                  <p className="activity-details">{activity.action}</p>
                  <span className="activity-date">{activity.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="leaves-card">
          <div className="card-header">
            <h2><i className="fas fa-calendar-times"></i> Upcoming Leaves</h2>
            <button className="add-leave-btn">
              <i className="fas fa-plus"></i> Add Leave
            </button>
          </div>
          <div className="leaves-list">
            {staffData.upcomingLeaves.map((leave, index) => (
              <div className="leave-item" key={index}>
                <div className="leave-header">
                  <div className="leave-info">
                    <strong>{leave.staff}</strong>
                    <span className={`leave-status status-${leave.status}`}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </div>
                  <span className="leave-type">{leave.type}</span>
                </div>
                <div className="leave-dates">
                  <div className="date-range">
                    <i className="fas fa-calendar-day"></i>
                    {leave.from} → {leave.to}
                  </div>
                  <div className="duration">
                    {Math.ceil((new Date(leave.to) - new Date(leave.from)) / (1000 * 60 * 60 * 24)) + 1} days
                  </div>
                </div>
                <div className="leave-actions">
                  <button className="btn-approve" title="Approve">
                    <i className="fas fa-check"></i>
                  </button>
                  <button className="btn-deny" title="Deny">
                    <i className="fas fa-times"></i>
                  </button>
                  <button className="btn-view" title="View Details">
                    <i className="fas fa-file-alt"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="quick-actions-panel">
        <h3><i className="fas fa-bolt"></i> Quick Staff Actions</h3>
        <div className="action-buttons-grid">
          <button className="action-card">
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #27ae60, #219653)' }}>
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <span>Process Payroll</span>
          </button>
          <button className="action-card">
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>
              <i className="fas fa-calendar-alt"></i>
            </div>
            <span>Schedule Shifts</span>
          </button>
          <button className="action-card">
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #f39c12, #d35400)' }}>
              <i className="fas fa-chart-line"></i>
            </div>
            <span>Performance Review</span>
          </button>
          <button className="action-card">
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}>
              <i className="fas fa-bell"></i>
            </div>
            <span>Send Announcement</span>
          </button>
          <button className="action-card">
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
              <i className="fas fa-download"></i>
            </div>
            <span>Export Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
