// Stand Reservation Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('standReservationForm');
    const receiptSection = document.getElementById('receiptSection');
    const successMessage = document.getElementById('successMessage');
    
    // Initialize Supabase client
    const supabaseUrl = 'https://mmzmssphmgstmktwkped.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tem1zc3BobWdzdG1rdHdrcGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDUwNTUsImV4cCI6MjEwMDM4MTA1NX0.T8PqHJsBQWhoiuHCBmXV1xUcvx6M-7ZWzNQAWZaEUTw';
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    const TOTAL_STANDS = 15;
    let currentReservations = 0;
    
    // Anti-fraud: Check for existing reservations from same phone/email
    async function checkExistingReservation(phone, email) {
        try {
            const { data, error } = await supabaseClient
                .from('stand_reservations')
                .select('id')
                .or(`telephone.eq.${phone}${email ? `,email.eq.${email}` : ''}`)
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0;
        } catch (error) {
            console.error('Error checking existing reservation:', error);
            // Fallback to localStorage
            const existingReservations = JSON.parse(localStorage.getItem('standReservations') || '[]');
            return existingReservations.some(r => 
                r.telephone === phone || (email && r.email === email)
            );
        }
    }
    
    // IP-based rate limiting
    async function checkRateLimit() {
        const rateLimitKey = 'standReservationRateLimit';
        const maxReservationsPerDay = 3;
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        try {
            const rateLimitData = JSON.parse(localStorage.getItem(rateLimitKey) || '{}');
            const today = new Date().toDateString();
            
            if (rateLimitData.date !== today) {
                // Reset counter for new day
                rateLimitData.date = today;
                rateLimitData.count = 0;
                rateLimitData.lastReservation = null;
            }
            
            if (rateLimitData.count >= maxReservationsPerDay) {
                const lastReservationTime = rateLimitData.lastReservation;
                const timeRemaining = oneDayMs - (Date.now() - lastReservationTime);
                const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
                
                alert(`Vous avez atteint la limite de ${maxReservationsPerDay} réservations par jour. Réessayez dans ${hoursRemaining} heure(s).`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Rate limit check error:', error);
            return true; // Allow reservation if rate limit check fails
        }
    }
    
    function incrementRateLimit() {
        const rateLimitKey = 'standReservationRateLimit';
        try {
            const rateLimitData = JSON.parse(localStorage.getItem(rateLimitKey) || '{}');
            const today = new Date().toDateString();
            
            if (rateLimitData.date !== today) {
                rateLimitData.date = today;
                rateLimitData.count = 0;
            }
            
            rateLimitData.count++;
            rateLimitData.lastReservation = Date.now();
            localStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData));
        } catch (error) {
            console.error('Rate limit increment error:', error);
        }
    }
    
    async function saveReservationInfo(data) {
        try {
            const { data: insertedData, error } = await supabaseClient
                .from('stand_reservations')
                .insert([{
                    ...data,
                    id: Date.now(),
                    timestamp: Date.now(),
                    status: 'pending_verification',
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            console.log('Reservation saved to Supabase');
            return true;
        } catch (error) {
            console.error('Error saving to Supabase:', error);
            // Fallback to localStorage
            const existingReservations = JSON.parse(localStorage.getItem('standReservations') || '[]');
            existingReservations.push({
                ...data,
                id: Date.now(),
                timestamp: Date.now(),
                status: 'pending_verification',
                created_at: new Date().toISOString()
            });
            localStorage.setItem('standReservations', JSON.stringify(existingReservations));
            return false;
        }
    }
    
    // Load current reservation count from localStorage
    const savedCount = localStorage.getItem('standReservationsCount');
    if (savedCount) {
        currentReservations = parseInt(savedCount, 10);
    }
    updateAvailabilityDisplay();
    
    function updateAvailabilityDisplay() {
        const availableStands = TOTAL_STANDS - currentReservations;
        const percentage = (currentReservations / TOTAL_STANDS) * 100;
        
        document.getElementById('availableStands').textContent = availableStands;
        document.getElementById('availabilityProgressFill').style.width = percentage + '%';
        
        // Change color if nearly full
        const progressFill = document.getElementById('availabilityProgressFill');
        if (availableStands <= 3) {
            progressFill.style.background = '#dc3545'; // Red
        } else if (availableStands <= 7) {
            progressFill.style.background = '#ffc107'; // Yellow
        } else {
            progressFill.style.background = '#ffd700'; // Gold
        }
        
        // Disable form if no stands available
        if (availableStands <= 0) {
            form.style.opacity = '0.5';
            form.style.pointerEvents = 'none';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Plus de places disponibles';
                submitBtn.disabled = true;
            }
        } else {
            form.style.opacity = '1';
            form.style.pointerEvents = 'auto';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Envoyer ma réservation';
                submitBtn.disabled = false;
            }
        }
    }
    
    // Listen for storage changes to sync counter across tabs
    window.addEventListener('storage', function(e) {
        if (e.key === 'standReservationsCount') {
            currentReservations = parseInt(e.newValue || '0', 10);
            updateAvailabilityDisplay();
        }
    });
    
    function incrementReservationCount() {
        currentReservations++;
        localStorage.setItem('standReservationsCount', currentReservations.toString());
        updateAvailabilityDisplay();
    }
    
    // Strict phone number validation
    function validatePhoneNumber(phone) {
        // Remove all non-numeric characters
        const cleanPhone = phone.replace(/\D/g, '');
        
        // Check if it's a valid Ivory Coast phone number
        // Format: +225 or 225 followed by 7-9 digits
        const ivoryCoastPattern = /^(\+?225|0)?[0-9]{7,9}$/;
        
        if (!ivoryCoastPattern.test(cleanPhone)) {
            return {
                valid: false,
                message: 'Numéro de téléphone invalide. Format attendu: +225XXXXXXXXX ou 0XXXXXXXXX'
            };
        }
        
        // Check if the number has the right length for Ivory Coast
        if (cleanPhone.length < 8 || cleanPhone.length > 12) {
            return {
                valid: false,
                message: 'Numéro de téléphone invalide. Doit contenir entre 8 et 12 chiffres.'
            };
        }
        
        return { valid: true };
    }
    
    // Real-time field validation
    const requiredFields = ['nom', 'telephone', 'activite', 'nom_activite', 'description'];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function() {
                validateField(this);
            });
            field.addEventListener('blur', function() {
                validateField(this);
            });
        }
    });
    
    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        switch(field.id) {
            case 'nom':
                isValid = value.length >= 2;
                errorMessage = 'Le nom doit contenir au moins 2 caractères';
                break;
            case 'telephone':
                const phoneValidation = validatePhoneNumber(value);
                isValid = phoneValidation.valid;
                errorMessage = phoneValidation.message || 'Numéro de téléphone invalide';
                break;
            case 'email':
                if (value) {
                    isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                    errorMessage = 'Email invalide';
                }
                break;
            case 'activite':
            case 'nom_activite':
                isValid = value.length >= 2;
                errorMessage = 'Ce champ doit contenir au moins 2 caractères';
                break;
            case 'description':
                isValid = value.length >= 10;
                errorMessage = 'La description doit contenir au moins 10 caractères';
                break;
        }
        
        // Remove existing error message
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message if invalid
        if (!isValid && value.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.style.color = '#dc3545';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '4px';
            errorDiv.textContent = errorMessage;
            field.parentElement.appendChild(errorDiv);
            field.style.borderColor = '#dc3545';
        } else if (isValid) {
            field.style.borderColor = '#28a745';
        } else {
            field.style.borderColor = '#ddd';
        }
        
        return isValid;
    }
    
    // File preview function
    window.previewFile = function(input) {
        const preview = document.getElementById('receiptPreview');
        const file = input.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.classList.add('active');
            };
            reader.readAsDataURL(file);
        } else {
            preview.src = '';
            preview.classList.remove('active');
        }
    };
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const data = {
            nom: formData.get('nom'),
            telephone: formData.get('telephone'),
            email: formData.get('email') || '',
            activite: formData.get('activite'),
            nom_activite: formData.get('nom_activite'),
            description: formData.get('description'),
            besoins: formData.get('besoins') || '',
            paymentConfirmed: document.getElementById('paymentConfirmed').checked
        };
        
        // Handle receipt file
        const receiptFile = document.getElementById('receipt').files[0];
        if (receiptFile) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                data.receipt = e.target.result;
                await submitReservation(data);
            };
            reader.readAsDataURL(receiptFile);
        } else {
            await submitReservation(data);
        }
    });
    
    async function submitReservation(data) {
        // Rate limiting check
        const canProceed = await checkRateLimit();
        if (!canProceed) return;
        
        // Anti-fraud: Check for existing reservations
        const hasExisting = await checkExistingReservation(data.telephone, data.email);
        if (hasExisting) {
            alert('Une réservation existe déjà pour ce numéro de téléphone ou email. Contactez-nous si vous avez besoin de modifier votre réservation.');
            return;
        }
        
        // Check if stands are available
        const availableStands = TOTAL_STANDS - currentReservations;
        if (availableStands <= 0) {
            alert('Désolé, il n\'y a plus de places disponibles pour les stands.');
            return;
        }
        
        // Save reservation info for anti-fraud tracking
        await saveReservationInfo(data);
        
        // Increment rate limit counter
        incrementRateLimit();
        
        // Increment reservation count regardless of Firebase success
        incrementReservationCount();
        
        // Show summary before WhatsApp
        displayReservationSummary(data);
        
        // Show success message
        successMessage.classList.add('active');
        
        // Show WhatsApp section with pre-filled message
        receiptSection.classList.add('active');
        
        // Hide form
        form.style.display = 'none';
        
        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth' });
        
        // Setup WhatsApp button
        setupWhatsAppButton(data);
    }
    
    function displayReservationSummary(data) {
        const summaryDiv = document.getElementById('reservationSummary');
        summaryDiv.innerHTML = `
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Nom complet</span>
                <span class="reservation-summary-value">${data.nom}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Téléphone</span>
                <span class="reservation-summary-value">${data.telephone}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Email</span>
                <span class="reservation-summary-value">${data.email || 'Non renseigné'}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Type d'activité</span>
                <span class="reservation-summary-value">${data.activite}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Nom de l'activité/entreprise</span>
                <span class="reservation-summary-value">${data.nom_activite}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Description</span>
                <span class="reservation-summary-value">${data.description}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Besoins spécifiques</span>
                <span class="reservation-summary-value">${data.besoins || 'Aucun'}</span>
            </div>
            <div class="reservation-summary-item">
                <span class="reservation-summary-label">Montant</span>
                <span class="reservation-summary-value">10 000 FCFA (Wave)</span>
            </div>
        `;
        
        // Add edit functionality
        document.getElementById('editReservationBtn').addEventListener('click', function() {
            form.style.display = 'block';
            receiptSection.classList.remove('active');
            successMessage.classList.remove('active');
            form.scrollIntoView({ behavior: 'smooth' });
        });
        
        // Add PDF download functionality
        document.getElementById('downloadPdfBtn').addEventListener('click', function() {
            downloadReservationPDF(data);
        });
        
        // Add QR code download functionality
        document.getElementById('downloadQrBtn').addEventListener('click', function() {
            downloadQRCode(data);
        });
        
        // Add social media sharing functionality
        document.querySelectorAll('.social-share-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const platform = this.dataset.platform;
                shareOnSocialMedia(platform, data);
            });
        });
        
        // Generate QR code
        generateQRCode(data);
    }
    
    function generateQRCode(data) {
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            return;
        }
        
        const qrData = JSON.stringify({
            id: data.timestamp || Date.now(),
            nom: data.nom,
            telephone: data.telephone,
            activite: data.activite,
            nom_activite: data.nom_activite
        });
        
        const qrContainer = document.getElementById('qrCodeContainer');
        qrContainer.innerHTML = '';
        
        QRCode.toCanvas(qrData, { width: 200, margin: 2 }, function(error, canvas) {
            if (error) {
                console.error('QR code generation error:', error);
                return;
            }
            canvas.id = 'qrCodeCanvas';
            qrContainer.appendChild(canvas);
            document.getElementById('qrCodeSection').style.display = 'block';
        });
    }
    
    function downloadQRCode(data) {
        const canvas = document.getElementById('qrCodeCanvas');
        if (!canvas) {
            alert('Code QR non disponible');
            return;
        }
        
        const link = document.createElement('a');
        link.download = `qr-reservation-${data.nom.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    
    function shareOnSocialMedia(platform, data) {
        const url = encodeURIComponent('https://asaaofficiel.vercel.app/reservation-stand.html');
        const text = encodeURIComponent(`🏪 J'ai réservé mon stand pour le Quiz Islamique 2026 ! Rejoignez-moi à la 4ᵉ édition de cet événement exceptionnel. #ASAAQI26 #QuizIslamique2026`);
        
        let shareUrl = '';
        
        switch(platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }
    
    function downloadReservationPDF(data) {
        const reservationNumber = 'RES-' + Date.now().toString().slice(-8);
        const currentDate = new Date().toLocaleDateString('fr-FR');
        
        const pdfContent = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║           🏆 CERTIFICAT DE RÉSERVATION DE STAND 🏆                           ║
║                                                                              ║
║                    QUIZ ISLAMIQUE 2026 - 4ᵉ ÉDITION                         ║
║                                                                              ║
║                    LES SERVITEURS D'ALLAH (ASAA)                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 NUMÉRO DE RÉSERVATION: ${reservationNumber}
📅 DATE: ${currentDate}

═══════════════════════════════════════════════════════════════════════════════

👤 INFORMATIONS DU RÉSERVATAIRE
═══════════════════════════════════════════════════════════════════════════════

Nom complet: ${data.nom}
Téléphone: ${data.telephone}
Email: ${data.email || 'Non renseigné'}

🏢 DÉTAILS DE L'ACTIVITÉ
═══════════════════════════════════════════════════════════════════════════════

Type d'activité: ${data.activite}
Nom de l'entreprise: ${data.nom_activite}

Description:
${data.description}

Besoins spécifiques: ${data.besoins || 'Aucun'}

💰 INFORMATIONS DE PAIEMENT
═══════════════════════════════════════════════════════════════════════════════

Montant: 10 000 FCFA
Méthode de paiement: Wave
Statut: Paiement confirmé par l'utilisateur
Validation: En attente de vérification par l'administration

⚠️ IMPORTANT
═══════════════════════════════════════════════════════════════════════════════

• Ce certificat confirme votre pré-réservation de stand
• La réservation sera définitivement validée après vérification du paiement
• Veuillez envoyer votre reçu de paiement via WhatsApp au +2250150070083
• Conservez ce document comme preuve de votre réservation
• Présentez ce certificat le jour de l'événement

📞 CONTACTS
═══════════════════════════════════════════════════════════════════════════════

☎️ 07 79 38 22 33
☎️ 07 49 97 44 90
☎️ 07 89 03 60 52

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🌟 MERCI DE VOTRE PARTICIPATION 🌟                             ║
║                                                                              ║
║              Nous avons hâte de vous accueillir !                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
        `;
        
        const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificat-reservation-${reservationNumber}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function setupWhatsAppButton(data) {
        const whatsappNumber = '2250150070083';
        
        // Create pre-filled message
        const message = `🏪 *Réservation de Stand - Quiz Islamique 2026*

📋 *Informations du réservataire:*
• Nom: ${data.nom}
• Téléphone: ${data.telephone}
• Email: ${data.email || 'Non renseigné'}
• Type d'activité: ${data.activite}
• Nom de l'activité: ${data.nom_activite}
• Description: ${data.description}
• Besoins spécifiques: ${data.besoins || 'Aucun'}

💰 *Paiement:* 10 000 FCFA via Wave confirmé

📎 *Reçu de paiement joint*

#ASAAQI26`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        
        // Update the WhatsApp button
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        whatsappBtn.href = whatsappUrl;
        whatsappBtn.target = '_blank';
    }
});
