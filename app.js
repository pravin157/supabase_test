/**
 * User Profile Registration Form Logic
 * Handles real-time input sync, file upload & drag-and-drop, validation, and live card preview.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Inputs & Form
  const form = document.getElementById('userProfileForm');
  const firstNameInput = document.getElementById('firstNameInput');
  const lastNameInput = document.getElementById('lastNameInput');
  const profileImageInput = document.getElementById('profileImageInput');
  const avatarDropZone = document.getElementById('avatarDropZone');
  const removeAvatarBtn = document.getElementById('removeAvatarBtn');
  const resetBtn = document.getElementById('resetBtn');

  // DOM Elements - Form Avatar Previews
  const avatarImage = document.getElementById('avatarImage');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');

  // DOM Elements - Live Card Preview
  const liveFullName = document.getElementById('liveFullName');
  const liveHandle = document.getElementById('liveHandle');
  const liveCardAvatar = document.getElementById('liveCardAvatar');
  const liveCardPlaceholder = document.getElementById('liveCardPlaceholder');

  // DOM Elements - Errors & Toast
  const firstNameError = document.getElementById('firstNameError');
  const lastNameError = document.getElementById('lastNameError');
  const avatarError = document.getElementById('avatarError');
  const toast = document.getElementById('toastNotification');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');

  let currentAvatarDataUrl = null;
  let toastTimeout = null;

  // Max image size (5MB in bytes)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /* ==========================================================================
     Real-Time Card Sync
     ========================================================================== */
  function updateLiveCard() {
    const fName = firstNameInput.value.trim();
    const lName = lastNameInput.value.trim();

    // Update Full Name
    if (fName || lName) {
      liveFullName.textContent = `${fName} ${lName}`.trim();
    } else {
      liveFullName.textContent = 'Your Name Here';
    }

    // Update Handle
    if (fName || lName) {
      const cleanFName = fName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLName = lName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanFName && cleanLName) {
        liveHandle.textContent = `@${cleanFName}.${cleanLName}`;
      } else {
        liveHandle.textContent = `@${cleanFName || cleanLName}`;
      }
    } else {
      liveHandle.textContent = '@username';
    }
  }

  firstNameInput.addEventListener('input', () => {
    clearFieldError(firstNameInput, firstNameError);
    updateLiveCard();
  });

  lastNameInput.addEventListener('input', () => {
    clearFieldError(lastNameInput, lastNameError);
    updateLiveCard();
  });

  /* ==========================================================================
     Image Upload & Handling
     ========================================================================== */
  function handleImageFile(file) {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFieldError(avatarError, 'Please select a valid image (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFieldError(avatarError, 'File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    clearFieldError(null, avatarError);

    const reader = new FileReader();
    reader.onload = (e) => {
      currentAvatarDataUrl = e.target.result;
      setAvatarPreview(currentAvatarDataUrl);
      showToast('Image Loaded', 'Profile photo updated successfully!', 'success');
    };
    reader.onerror = () => {
      setFieldError(avatarError, 'Failed to read the file. Please try another image.');
    };
    reader.readAsDataURL(file);
  }

  function setAvatarPreview(url) {
    if (url) {
      // Form Preview
      avatarImage.src = url;
      avatarImage.classList.remove('hidden');
      avatarPlaceholder.classList.add('hidden');
      removeAvatarBtn.classList.remove('hidden');

      // Live Card Preview
      liveCardAvatar.src = url;
      liveCardAvatar.classList.remove('hidden');
      liveCardPlaceholder.classList.add('hidden');
    } else {
      // Clear Form Preview
      avatarImage.src = '';
      avatarImage.classList.add('hidden');
      avatarPlaceholder.classList.remove('hidden');
      removeAvatarBtn.classList.add('hidden');

      // Clear Live Card Preview
      liveCardAvatar.src = '';
      liveCardAvatar.classList.add('hidden');
      liveCardPlaceholder.classList.remove('hidden');
    }
  }

  function resetAvatar() {
    currentAvatarDataUrl = null;
    profileImageInput.value = '';
    setAvatarPreview(null);
    clearFieldError(null, avatarError);
  }

  profileImageInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleImageFile(file);
    }
  });

  removeAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetAvatar();
  });

  // Drag and Drop support
  ['dragenter', 'dragover'].forEach(eventName => {
    avatarDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      avatarDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    avatarDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      avatarDropZone.classList.remove('dragover');
    });
  });

  avatarDropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files && dt.files[0];
    if (file) {
      handleImageFile(file);
    }
  });

  // Clicking on avatar preview box triggers file input (unless clicking remove button)
  avatarDropZone.addEventListener('click', (e) => {
    if (e.target.closest('#removeAvatarBtn')) return;
    profileImageInput.click();
  });

  // Keyboard accessibility for dropzone
  avatarDropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      profileImageInput.click();
    }
  });

  /* ==========================================================================
     Validation Helpers
     ========================================================================== */
  function setFieldError(errorElement, message, inputElement = null) {
    if (errorElement) {
      errorElement.textContent = message;
    }
    if (inputElement) {
      inputElement.closest('.input-wrapper')?.classList.add('error');
    }
  }

  function clearFieldError(inputElement, errorElement) {
    if (errorElement) {
      errorElement.textContent = '';
    }
    if (inputElement) {
      inputElement.closest('.input-wrapper')?.classList.remove('error');
    }
  }

  function validateForm() {
    let isValid = true;
    const fName = firstNameInput.value.trim();
    const lName = lastNameInput.value.trim();

    // First Name Validation
    if (!fName) {
      setFieldError(firstNameError, 'First name is required.', firstNameInput);
      isValid = false;
    } else if (fName.length < 2) {
      setFieldError(firstNameError, 'First name must be at least 2 characters.', firstNameInput);
      isValid = false;
    } else {
      clearFieldError(firstNameInput, firstNameError);
    }

    // Last Name Validation
    if (!lName) {
      setFieldError(lastNameError, 'Last name is required.', lastNameInput);
      isValid = false;
    } else if (lName.length < 2) {
      setFieldError(lastNameError, 'Last name must be at least 2 characters.', lastNameInput);
      isValid = false;
    } else {
      clearFieldError(lastNameInput, lastNameError);
    }

    // Profile Image Validation
    if (!currentAvatarDataUrl) {
      setFieldError(avatarError, 'Please upload a profile photo.');
      isValid = false;
    } else {
      clearFieldError(null, avatarError);
    }

    return isValid;
  }

  /* ==========================================================================
     Toast Notifications
     ========================================================================== */
  function showToast(title, message, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.className = `toast show ${type}`;

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  /* ==========================================================================
     Form Submission & Reset
     ========================================================================== */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Validation Error', 'Please complete all required fields.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalBtnHtml = submitBtn.innerHTML;

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Saving to Supabase...</span>
    `;

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: firstNameInput.value.trim(),
          lastName: lastNameInput.value.trim(),
          avatarBase64: currentAvatarDataUrl
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(
          'Profile Saved!',
          `Successfully saved ${result.profile.firstName} ${result.profile.lastName} to Supabase!`,
          'success'
        );
        if (result.profile.avatarUrl) {
          setAvatarPreview(result.profile.avatarUrl);
        }
      } else if (result.needsSchemaMigration) {
        showToast(
          'Storage Uploaded!',
          'Avatar saved to Supabase storage. Run schema.sql in Supabase SQL editor to create the table.',
          'info'
        );
      } else {
        showToast('Error', result.error || 'Failed to save profile.', 'error');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Connection Error', 'Could not reach the backend server. Is it running?', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    resetAvatar();
    clearFieldError(firstNameInput, firstNameError);
    clearFieldError(lastNameInput, lastNameError);
    clearFieldError(null, avatarError);
    updateLiveCard();
    showToast('Reset', 'Form cleared back to default state.', 'info');
  });

  // Initialize view
  updateLiveCard();
});
