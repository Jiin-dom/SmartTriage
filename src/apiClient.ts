const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Token management
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('authToken', token)
  } else {
    localStorage.removeItem('authToken')
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken')
}

// Helper function to make API requests
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// API client object
export const api = {
  // Auth
  async login(email: string, password: string) {
    return request<{ token: string; user: { id: string; email: string; role: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  // Tickets
  async getTickets(filters?: {
    status?: string
    priority?: string
    search?: string
    page?: number
    pageSize?: number
  }) {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString())

    const query = params.toString()
    return request<{ data: any[]; pagination: any }>(`/api/tickets${query ? `?${query}` : ''}`)
  },

  async createTicket(data: {
    title: string
    description: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    deadline?: string | null
  }) {
    return request<{ ticket: any }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getTicketDetails(id: string) {
    return request<any>(`/api/tickets/${id}`)
  },

  async getTicketComments(id: string) {
    return request<{ data: any[] }>(`/api/tickets/${id}/comments`)
  },

  async addTicketComment(id: string, message: string) {
    return request<any>(`/api/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  async updateTicket(id: string, data: {
    status?: 'open' | 'in_progress' | 'resolved'
    priority?: 'low' | 'medium' | 'high' | 'critical'
    assignedTo?: string | null
    title?: string
    description?: string
    deadline?: string | null
  }) {
    return request<any>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async getTicketSummary() {
    return request<any>('/api/tickets/summary/stats')
  },

  async smartAssign(ticketId: string) {
    return request<any>(`/api/tickets/${ticketId}/smart-assign`, {
      method: 'POST',
    })
  },

  async exportTickets(format: 'csv' | 'json') {
    const response = await fetch(`${API_BASE_URL}/api/tickets/export/${format}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets-${Date.now()}.${format}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  async suggestTicketSort(filters?: {
    status?: string
    priority?: string
    search?: string
  }) {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.search) params.append('search', filters.search)

    const query = params.toString()
    return request<any>(`/api/tickets/suggest-sort${query ? `?${query}` : ''}`, {
      method: 'POST',
    })
  },

  async deleteTicket(id: string) {
    console.log('apiClient.deleteTicket called with id:', id)
    try {
      const result = await request<{ success: boolean; message: string }>(`/api/tickets/${id}`, {
        method: 'DELETE',
      })
      console.log('apiClient.deleteTicket success:', result)
      return result
    } catch (error) {
      console.error('apiClient.deleteTicket error:', error)
      throw error
    }
  },

  // Users
  async getUsers() {
    return request<{ data: any[] }>('/api/users')
  },

  async getProfile() {
    return request<any>('/api/users/me')
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    return request<{ success: boolean }>('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  async updatePreferences(preferences: {
    notification_preferences?: Record<string, any>
    ai_preferences?: Record<string, any>
  }) {
    return request<any>('/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    })
  },

  async updateUserRole(userId: string, role: 'admin' | 'agent') {
    return request<any>(`/api/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  },

  async updateUserActive(userId: string, isActive: boolean) {
    return request<any>(`/api/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    })
  },

  async createUser(data: { name: string; email: string; role: 'admin' | 'agent'; password: string }) {
    return request<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

