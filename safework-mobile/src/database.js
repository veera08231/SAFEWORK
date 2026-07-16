import { API_URL } from './config';

// No local SQLite database is needed anymore!
// All data is stored on your Render Node.js backend.

export async function initDatabase() {
  console.log('Using Remote Backend instead of SQLite');
  return true;
}

export function getDb() {
  return null;
}

// =============== USER OPERATIONS ===============

export async function registerUser(name, email, password) {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    return {
      success: response.ok,
      msg: data.msg || (response.ok ? 'Registered' : 'Registration failed'),
      userId: data.userId,
      name: data.name
    };
  } catch (err) {
    console.error('Register error:', err);
    return { success: false, msg: 'Network error or server unreachable' };
  }
}

export async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    return {
      success: response.ok,
      msg: data.msg || (response.ok ? 'Login successful' : 'Login failed'),
      userId: data.userId,
      name: data.name,
      email: data.email
    };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, msg: 'Network error or server unreachable' };
  }
}

export async function getUserById(userId) {
  // Not strictly needed in most screens if stored in context, but adding a stub.
  return { id: userId, name: "User", email: "user@safework.com" };
}

// =============== COMPLAINT OPERATIONS ===============

export async function submitComplaint(userId, incident, description, filePath, email) {
  try {
    const response = await fetch(`${API_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, incident, description, filePath })
    });
    const data = await response.json();
    return {
      success: response.ok,
      msg: data.msg || 'Complaint submitted',
      caseId: data.caseId,
      complaintId: data.complaintId
    };
  } catch (err) {
    console.error('Submit complaint error:', err);
    return { success: false, msg: 'Submission failed' };
  }
}

export async function getComplaintsByUserId(userId) {
  try {
    const response = await fetch(`${API_URL}/complaints/${userId}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error('Get complaints error:', err);
    return [];
  }
}

export async function getComplaintByCaseId(caseId) {
  try {
    const response = await fetch(`${API_URL}/complaints/case/${caseId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Get complaint error:', err);
    return null;
  }
}

// =============== SOS OPERATIONS ===============

export async function createSOSAlert(userId, latitude, longitude) {
  try {
    const response = await fetch(`${API_URL}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, latitude, longitude })
    });
    const data = await response.json();
    return {
      success: response.ok,
      sosId: data.sosId,
      msg: data.msg || 'SOS Created'
    };
  } catch (err) {
    console.error('Create SOS error:', err);
    return { success: false, msg: 'Failed to create SOS alert' };
  }
}

export async function createSOSAlertWithAudio(userId, latitude, longitude, audioUri) {
  try {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    
    if (audioUri) {
      formData.append('audio', {
        uri: audioUri,
        name: 'sos-audio.m4a',
        type: 'audio/m4a'
      });
      formData.append('audioDurationSeconds', '8');
    }

    const response = await fetch(`${API_URL}/sos`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const data = await response.json();
    return {
      success: response.ok,
      sosId: data.sosId,
      msg: data.msg || 'SOS Created'
    };
  } catch (err) {
    console.error('Create SOS with audio error:', err);
    return { success: false, msg: 'Failed to create SOS alert' };
  }
}

export async function getSOSHistoryByUserId(userId) {
  try {
    const response = await fetch(`${API_URL}/sos/history/${userId}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error('Get SOS history error:', err);
    return [];
  }
}

export async function cancelSOSAlert(sosId) {
  try {
    const response = await fetch(`${API_URL}/sos/cancel/${sosId}`, {
      method: 'POST'
    });
    return { success: response.ok };
  } catch (err) {
    console.error('Cancel SOS error:', err);
    return { success: false };
  }
}

export async function getSOSAlertById(sosId) {
  try {
    // Basic stub, might not need full implementation for frontend
    return { _id: sosId };
  } catch (err) {
    return null;
  }
}

// =============== LIVE TRACKING OPERATIONS ===============

export async function addTrackingUpdate(sosId, latitude, longitude) {
  try {
    await fetch(`${API_URL}/sos/${sosId}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: { latitude, longitude } })
    });
  } catch (err) {
    console.error('Add tracking error:', err);
  }
}

export async function getTrackingUpdates(sosId) {
  // Not strictly implemented on frontend view usually, returning empty for now
  return [];
}

// =============== EVIDENCE OPERATIONS ===============

export async function saveEvidenceAudio(sosId, audioPath, mimeType, durationSeconds) {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioPath,
      name: 'sos-audio.m4a',
      type: mimeType || 'audio/m4a'
    });
    formData.append('durationSeconds', durationSeconds);

    await fetch(`${API_URL}/sos/${sosId}/audio`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
  } catch (err) {
    console.error('Save audio error:', err);
  }
}

export async function saveEvidenceVideo(sosId, videoPath, mimeType, durationSeconds) {
  try {
    const formData = new FormData();
    formData.append('video', {
      uri: videoPath,
      name: 'sos-video.mp4',
      type: mimeType || 'video/mp4'
    });
    formData.append('durationSeconds', durationSeconds);

    await fetch(`${API_URL}/sos/${sosId}/video`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
  } catch (err) {
    console.error('Save video error:', err);
  }
}

export async function saveEvidenceImage(sosId, imagePath, mimeType) {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri: imagePath,
      name: 'sos-image.jpg',
      type: mimeType || 'image/jpeg'
    });

    await fetch(`${API_URL}/sos/${sosId}/image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
  } catch (err) {
    console.error('Save image error:', err);
  }
}