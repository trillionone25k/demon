document.addEventListener('DOMContentLoaded', () => {
  // Check if logged in
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }
  
  // DOM Elements
  const logoutBtn = document.getElementById('logout-btn');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const domainFilter = document.getElementById('domain-filter');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const tableBody = document.getElementById('credentials-table-body');
  const loadingIndicator = document.getElementById('loading-indicator');
  const emptyState = document.getElementById('empty-state');
  const totalCredentialsEl = document.getElementById('total-credentials');
  const uniqueDomainsEl = document.getElementById('unique-domains');
  const newThisWeekEl = document.getElementById('new-this-week');
  
  // Modal elements
  const passwordModal = document.getElementById('password-modal');
  const closeModalBtn = document.querySelector('.close-btn');
  const modalWebsite = document.getElementById('modal-website');
  const modalUsername = document.getElementById('modal-username');
  const modalPassword = document.getElementById('modal-password');
  const modalDate = document.getElementById('modal-date');
  const copyPasswordBtn = document.getElementById('copy-password');
  
  // State
  let currentPage = 1;
  let totalPages = 1;
  let searchQuery = '';
  let currentDomain = '';
  let credentials = [];
  let domainList = [];
  
  // Load data
  loadStats();
  loadCredentials();
  loadDomains();
  
  // Event listeners
  logoutBtn.addEventListener('click', handleLogout);
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  domainFilter.addEventListener('change', handleDomainFilter);
  prevPageBtn.addEventListener('click', handlePrevPage);
  nextPageBtn.addEventListener('click', handleNextPage);
  closeModalBtn.addEventListener('click', () => {
    passwordModal.style.display = 'none';
  });
  copyPasswordBtn.addEventListener('click', handleCopyPassword);
  
  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
      passwordModal.style.display = 'none';
    }
  });
  
  // Functions
  async function loadCredentials() {
    try {
      showLoading(true);
      
      let url = `/admin/credentials?page=${currentPage}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (currentDomain) {
        url += `&domain=${encodeURIComponent(currentDomain)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to load credentials');
      }
      
      const data = await response.json();
      
      if (data.success) {
        credentials = data.data;
        totalPages = data.pagination.pages;
        currentPage = data.pagination.current;
        
        updatePagination();
        renderCredentialsTable();
        
        // Show empty state if no credentials
        if (data.data.length === 0) {
          showEmptyState(true);
        } else {
          showEmptyState(false);
        }
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      alert('Failed to load credentials. Please try again.');
    } finally {
      showLoading(false);
    }
  }
  
  async function loadStats() {
    try {
      const response = await fetch('/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }
      
      const data = await response.json();
      
      if (data.success) {
        totalCredentialsEl.textContent = data.data.totalCredentials;
        uniqueDomainsEl.textContent = data.data.uniqueDomains;
        newThisWeekEl.textContent = data.data.lastWeekCredentials;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
  
  async function loadDomains() {
    try {
      const response = await fetch('/admin/credentials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load domains');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Extract unique domains
        const domains = [...new Set(data.data.map(cred => cred.domain))].sort();
        domainList = domains;
        
        // Update domain filter dropdown
        domainFilter.innerHTML = '<option value="">All Domains</option>';
        domains.forEach(domain => {
          const option = document.createElement('option');
          option.value = domain;
          option.textContent = domain;
          domainFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  }
  
  function renderCredentialsTable() {
    tableBody.innerHTML = '';
    
    credentials.forEach(cred => {
      const tr = document.createElement('tr');
      
      // Website/Domain
      const tdWebsite = document.createElement('td');
      tdWebsite.innerHTML = `<strong>${cred.domain}</strong><br><small>${truncateText(cred.website, 40)}</small>`;
      
      // Username
      const tdUsername = document.createElement('td');
      tdUsername.textContent = cred.username;
      
      // Password (masked)
      const tdPassword = document.createElement('td');
      const maskedPassword = '•'.repeat(8);
      tdPassword.innerHTML = `<span class="masked-password">${maskedPassword}</span>`;
      
      // Date
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(cred.timestamp);
      
      // Actions
      const tdActions = document.createElement('td');
      tdActions.className = 'actions';
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'action-btn view';
      viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
      viewBtn.title = 'View password';
      viewBtn.addEventListener('click', () => showPasswordModal(cred));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.title = 'Delete credential';
      deleteBtn.addEventListener('click', () => deleteCredential(cred._id));
      
      tdActions.appendChild(viewBtn);
      tdActions.appendChild(deleteBtn);
      
      tr.appendChild(tdWebsite);
      tr.appendChild(tdUsername);
      tr.appendChild(tdPassword);
      tr.appendChild(tdDate);
      tr.appendChild(tdActions);
      
      tableBody.appendChild(tr);
    });
  }
  
  function showPasswordModal(credential) {
    modalWebsite.textContent = credential.domain;
    modalUsername.textContent = credential.username;
    modalPassword.value = credential.password;
    modalDate.textContent = formatDate(credential.timestamp);
    passwordModal.style.display = 'block';
  }
  
  function handleCopyPassword() {
    modalPassword.select();
    document.execCommand('copy');
    
    // Show feedback
    const originalText = copyPasswordBtn.innerHTML;
    copyPasswordBtn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      copyPasswordBtn.innerHTML = originalText;
    }, 1500);
  }
  
  function updatePagination() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }
  
  function handleSearch() {
    searchQuery = searchInput.value.trim();
    currentPage = 1;
    loadCredentials();
  }
  
  function handleDomainFilter() {
    currentDomain = domainFilter.value;
    currentPage = 1;
    loadCredentials();
  }
  
  function handlePrevPage() {
    if (currentPage > 1) {
      currentPage--;
      loadCredentials();
    }
  }
  
  function handleNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      loadCredentials();
    }
  }
  
  async function deleteCredential(id) {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/credentials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }
      
      const data = await response.json();
      
      if (data.success) {
        loadCredentials();
        loadStats();
      }
    } catch (error) {
      console.error('Error deleting credential:', error);
      alert('Failed to delete credential. Please try again.');
    }
  }
  
  function handleLogout() {
    localStorage.removeItem('authToken');
    window.location.href = '/index.html';
  }
  
  function showLoading(show) {
    if (show) {
      loadingIndicator.classList.remove('hidden');
    } else {
      loadingIndicator.classList.add('hidden');
    }
  }
  
  function showEmptyState(show) {
    if (show) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
});
