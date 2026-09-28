/**
 * Profile Logic - Load, Preview Avatar & Save Updates
 */

async function loadProfileData() {
  try {
    const res = await apiFetch('/api/v1/user/profile');
    if (res.status === 'success') {
      const u = res.data;
      document.getElementById('profile-fullname').value = u.full_name || '';
      document.getElementById('profile-studentid').value = u.student_id || '';
      document.getElementById('profile-class').value = u.class_name || '';
      document.getElementById('profile-email').value = u.email || '';

      const savedAvatar = localStorage.getItem('iot_user_avatar');
      if (savedAvatar) {
        document.getElementById('avatar-preview-img').src = savedAvatar;
      } else if (u.avatar_url) {
        document.getElementById('avatar-preview-img').src = u.avatar_url;
      }

      if (u.links) {
        document.getElementById('profile-github').value = u.links.github || '';
        document.getElementById('profile-figma').value = u.links.figma || '';
        document.getElementById('profile-postman').value = u.links.postman || '';
        document.getElementById('profile-report').value = u.links.report || '';

        // Cập nhật href các nút Mở link
        updateLinkHref('link-github-btn', u.links.github);
        updateLinkHref('link-figma-btn', u.links.figma);
        updateLinkHref('link-postman-btn', u.links.postman);
        updateLinkHref('link-report-btn', u.links.report);
      }
    }
  } catch (err) {
    console.error('Lỗi tải hồ sơ:', err);
    showToast('Chưa kết nối máy chủ Backend! Hãy chạy lệnh: node server.js', 'error');
  }
}

function updateLinkHref(elementId, url) {
  const btn = document.getElementById(elementId);
  if (btn && url) {
    btn.href = url;
  }
}

// Xử lý lưu hồ sơ
async function handleProfileSubmit(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btn-save-profile');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span class="inline-block animate-spin mr-2">⟳</span> Đang lưu...`;

  const payload = {
    full_name: document.getElementById('profile-fullname').value.trim(),
    class_name: document.getElementById('profile-class').value.trim(),
    email: document.getElementById('profile-email').value.trim(),
    avatar_url: document.getElementById('avatar-preview-img')?.src || null,
    links: {
      github: document.getElementById('profile-github').value.trim(),
      figma: document.getElementById('profile-figma').value.trim(),
      postman: document.getElementById('profile-postman').value.trim(),
      report: document.getElementById('profile-report').value.trim()
    }
  };

  try {
    const res = await apiFetch('/api/v1/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res.status === 'success') {
      showToast('Cập nhật hồ sơ cá nhân và các liên kết thành công!', 'success');
      // Cập nhật lại các nút Mở link
      updateLinkHref('link-github-btn', payload.links.github);
      updateLinkHref('link-figma-btn', payload.links.figma);
      updateLinkHref('link-postman-btn', payload.links.postman);
      updateLinkHref('link-report-btn', payload.links.report);

      // Cập nhật header và lưu cache
      localStorage.setItem('iot_user_profile', JSON.stringify({ ...payload, student_id: document.getElementById('profile-studentid').value }));
      if (typeof applyHeaderUserInfo === 'function') {
        applyHeaderUserInfo(payload);
      }
    } else {
      showToast(res.message || 'Lỗi khi cập nhật!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ API!', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalText;
  }
}

// Thông báo Toast nhỏ xinh
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bg = type === 'success' ? APP_COLORS.ui.toastSuccess : APP_COLORS.ui.toastError;
  toast.className = `fixed bottom-6 right-6 ${bg} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium z-50 transition-all transform translate-y-2 opacity-0`;
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 50);

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Xử lý xem trước ảnh đại diện khi chọn file
function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      document.getElementById('avatar-preview-img').src = dataUrl;
      const headerImg = document.getElementById('header-user-avatar-img');
      if (headerImg) headerImg.src = dataUrl;
      localStorage.setItem('iot_user_avatar', dataUrl);
      showToast('Đã chọn ảnh đại diện mới!', 'success');
    };
    reader.readAsDataURL(file);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();
});
