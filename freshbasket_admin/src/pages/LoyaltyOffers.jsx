// pages/LoyaltyOffers.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LoyaltyOffers.css';

const LoyaltyOffers = () => {

  const BASE_URL = "http://localhost:8000/api";

  const [activeTab, setActiveTab] = useState('active');

  const [loyaltyData, setLoyaltyData] = useState({
    overview: [],
    offers: { active: [], upcoming: [], expired: [] },
    loyaltyTiers: [],
    pointActivities: [],
    topRedeemers: []
  });

  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newOffer, setNewOffer] = useState({
    name: '',
    type: 'Discount',
    discount: '',
    minPurchase: '',
    startDate: '',
    validUntil: '',
    totalOffers: '',
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /* ================= FETCH DASHBOARD ================= */

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toISOString().split("T")[0];
    } catch {
      return "-";
    }
  };

  const normalizeOffer = (offer) => ({
    ...offer,
    id: offer.id || offer.offer_code,
    name: offer.name || offer.offer_name,
    type: offer.type || offer.offer_type,
    discount: offer.discount || offer.discount_value,
    minPurchase: offer.minPurchase || offer.min_purchase,
    startDate: formatDate(offer.startDate || offer.start_date),
    validUntil: formatDate(offer.validUntil || offer.valid_until),
    redeemed: offer.redeemed || 0,
    total: offer.total || offer.total_offers || 0,
  });

  const fetchDashboardData = async () => {

    try {

      setLoading(true);
      setError(null);

      const response = await axios.get(`${BASE_URL}/loyalty/dashboard`);

      const offers = response.data.offers || {};

      setLoyaltyData({
        ...response.data,
        offers: {
          active: (offers.active || []).map(normalizeOffer),
          upcoming: (offers.upcoming || []).map(normalizeOffer),
          expired: (offers.expired || []).map(normalizeOffer),
        }
      });

    }

    catch(err){

      console.error("Error fetching dashboard:",err);
      setError("Failed to fetch dashboard data");

    }

    finally{

      setLoading(false);

    }

  };

  /* ================= FILTER ================= */

  const getCurrentOffers = () => loyaltyData.offers[activeTab] || [];

  const filteredOffers = getCurrentOffers().filter(offer =>
    offer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= FORM ================= */

  const handleInputChange = (e)=>{
    const {name,value}=e.target;
    setNewOffer(prev=>({...prev,[name]:value}));
  };

  const handleCreateOffer = async()=>{

    if(!newOffer.name || !newOffer.discount || !newOffer.startDate || !newOffer.validUntil){
      alert("Please fill all required fields");
      return;
    }

    if(newOffer.validUntil < newOffer.startDate){
      alert("Valid Until must be after Start Date");
      return;
    }

    try{

      setLoading(true);

      if(editingOffer){

await axios.put(`${BASE_URL}/loyalty/offers/${editingOffer.id}`,{
  name: newOffer.name,
  type: newOffer.type,
  discount: newOffer.discount,
  minPurchase: newOffer.minPurchase,
  startDate: newOffer.startDate,
  validUntil: newOffer.validUntil,
  totalOffers: newOffer.totalOffers,
  status: editingOffer.status
});

        alert("Offer updated successfully");

      }

      else{

        await axios.post(`${BASE_URL}/loyalty/offers`,newOffer);

        alert("Offer created successfully");

      }

      await fetchDashboardData();
      resetForm();

    }

    catch(err){

      console.error("Error saving offer",err);
      alert(err.response?.data?.message || "Failed to save offer");

    }

    finally{

      setLoading(false);

    }

  };

  const handleEditOffer = (offer)=>{

    setNewOffer({
      name:offer.name,
      type:offer.type,
      discount:offer.discount,
      minPurchase:offer.minPurchase,
      startDate:offer.startDate,
      validUntil:offer.validUntil,
      totalOffers:offer.total?.toString() || ""
    });

    setEditingOffer(offer);
    setShowForm(true);

  };

  const handleDeleteOffer = async(code)=>{

    if(!window.confirm("Are you sure you want to delete this offer?")) return;

    try{

      setLoading(true);

      await axios.delete(`${BASE_URL}/loyalty/offers/${code}`);

      alert("Offer deleted successfully");

      await fetchDashboardData();

    }

    catch(err){

      console.error(err);
      alert("Failed to delete offer");

    }

    finally{

      setLoading(false);

    }

  };

  const handleEndOffer = async(offer)=>{

    if(!window.confirm("Are you sure you want to end this offer?")) return;

    try{

      setLoading(true);

      await axios.put(`${BASE_URL}/loyalty/offers/${offer.id}`,{
        ...offer,
        status:"expired"
      });

      alert("Offer ended successfully");

      await fetchDashboardData();

    }

    catch(err){

      console.error(err);
      alert("Failed to end offer");

    }

    finally{

      setLoading(false);

    }

  };

  const resetForm = ()=>{

    setNewOffer({
      name:'',
      type:'Discount',
      discount:'',
      minPurchase:'',
      startDate:'',
      validUntil:'',
      totalOffers:''
    });

    setEditingOffer(null);
    setShowForm(false);

  };

  if(loading && loyaltyData.overview.length===0){

    return(
      <div className="loyalty-offers">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading loyalty data...</p>
        </div>
      </div>
    );

  }

  return(
    <div className="loyalty-offers">

      {error && (
        <div className="error-message">
          <span><i className="fas fa-exclamation-circle"></i> {error}</span>
          <button onClick={()=>setError(null)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* --- UI unchanged below --- */}

      <div className="page-header">
        <div className="header-title">
          <h1>Loyalty & Offers Management</h1>
          <p>Manage customer loyalty programs, points, and promotional offers</p>
        </div>
      </div>

      <div className="table-section">

        <div className="section-header">

          <div className="section-title">
            <h2><i className="fas fa-list"></i> Offers Management</h2>
            <span className="item-count">{filteredOffers.length} items</span>
          </div>

          <div className="table-controls">

            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="     Search offers by name or ID..."
                value={searchTerm}
                onChange={(e)=>setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className="btn btn-secondary"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>

            <button
              className="btn btn-primary"
              onClick={()=>setShowForm(true)}
              disabled={loading}
            >
              <i className="fas fa-plus"></i> Create Offer
            </button>

          </div>

        </div>

        <div className="tabs-container">

          <button
            className={`tab-btn ${activeTab==='active'?'active':''}`}
            onClick={()=>setActiveTab('active')}
          >
            Active Offers ({loyaltyData.offers.active?.length || 0})
          </button>

          <button
            className={`tab-btn ${activeTab==='upcoming'?'active':''}`}
            onClick={()=>setActiveTab('upcoming')}
          >
            Upcoming ({loyaltyData.offers.upcoming?.length || 0})
          </button>

          <button
            className={`tab-btn ${activeTab==='expired'?'active':''}`}
            onClick={()=>setActiveTab('expired')}
          >
            Expired ({loyaltyData.offers.expired?.length || 0})
          </button>

        </div>

        <div className="table-wrapper">

          <table className="data-table">

            <thead>
              <tr>
                <th>Offer ID</th>
                <th>Offer Name</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min. Purchase</th>
                <th>Start Date</th>
                <th>Valid Until</th>
                <th>Redemption</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredOffers.map((offer)=>(
                <tr key={offer.id}>

                  <td className="offer-id">{offer.id}</td>
                  <td className="offer-name"><strong>{offer.name}</strong></td>

                  <td>
                    <span className={`offer-type type-${offer.type.toLowerCase()}`}>
                      {offer.type}
                    </span>
                  </td>

                  <td className="offer-discount"><strong>{offer.discount}</strong></td>

                  <td className="offer-purchase">{offer.minPurchase}</td>

                  <td className="offer-valid">{offer.startDate}</td>

                  <td className="offer-valid">{offer.validUntil}</td>

                  <td>

                    <div className="redemption-progress">

                      <div className="progress-info">
                        <span>{offer.redeemed}/{offer.total}</span>
                        <span>
                          {offer.total ? ((offer.redeemed/offer.total)*100).toFixed(0) : 0}%
                        </span>
                      </div>

                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: offer.total ? `${(offer.redeemed/offer.total)*100}%` : '0%'
                          }}
                        ></div>
                      </div>

                    </div>

                  </td>

                  <td>

                    <span className={`status-badge status-${offer.status}`}>
                      {offer.status.charAt(0).toUpperCase()+offer.status.slice(1)}
                    </span>

                  </td>

                  <td>

                    <div className="action-buttons">

                      <button
                        className="btn-action edit"
                        onClick={()=>handleEditOffer(offer)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>

                      <button
                        className="btn-action delete"
                        onClick={()=>handleDeleteOffer(offer.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>

                      {activeTab==='active' && (

                        <button
                          className="btn-action end"
                          onClick={()=>handleEndOffer(offer)}
                        >
                          <i className="fas fa-stop-circle"></i>
                        </button>

                      )}

                    </div>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>
      {/* Create/Edit Offer Modal */}
{showForm && (
  <div className="modal-overlay">
    <div className="modal">

      <div className="modal-header">
        <h3>
          <i className="fas fa-tag"></i>
          {editingOffer ? "Edit Offer" : "Create New Offer"}
        </h3>

        <button
          className="modal-close"
          onClick={resetForm}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateOffer();
        }}
      >

        <div className="form-group">
          <label>Offer Name *</label>
          <input
            type="text"
            name="name"
            value={newOffer.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-row">

          <div className="form-group">
            <label>Offer Type</label>
            <select
              name="type"
              value={newOffer.type}
              onChange={handleInputChange}
            >
              <option value="Discount">Discount</option>
              <option value="Bundle">Bundle</option>
              <option value="Points">Extra Points</option>
              <option value="Freebie">Free Item</option>
            </select>
          </div>

          <div className="form-group">
            <label>Discount *</label>
            <input
              type="text"
              name="discount"
              value={newOffer.discount}
              onChange={handleInputChange}
              required
            />
          </div>

        </div>

        <div className="form-row">

          <div className="form-group">
            <label>Minimum Purchase</label>
            <input
              type="text"
              name="minPurchase"
              value={newOffer.minPurchase}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={newOffer.startDate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Valid Until *</label>
            <input
              type="date"
              name="validUntil"
              value={newOffer.validUntil}
              onChange={handleInputChange}
              required
            />
          </div>

        </div>

        <div className="form-group">
          <label>Total Offers</label>
          <input
            type="number"
            name="totalOffers"
            value={newOffer.totalOffers}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-actions">

          <button type="submit" className="btn btn-primary">
            {editingOffer ? "Update Offer" : "Create Offer"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={resetForm}
          >
            Cancel
          </button>

        </div>

      </form>
    </div>
  </div>
)}

    </div>
  );

  

};

export default LoyaltyOffers;