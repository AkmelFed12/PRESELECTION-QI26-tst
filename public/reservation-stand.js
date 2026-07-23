// Stand Reservation Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('standReservationForm');
    const receiptSection = document.getElementById('receiptSection');
    const successMessage = document.getElementById('successMessage');
    
    const TOTAL_STANDS = 15;
    let currentReservations = 0;
    
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
    }
    
    function incrementReservationCount() {
        currentReservations++;
        localStorage.setItem('standReservationsCount', currentReservations.toString());
        updateAvailabilityDisplay();
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
                isValid = /^[\d\s\+\-]{8,20}$/.test(value.replace(/\s/g, ''));
                errorMessage = 'Numéro de téléphone invalide (8-20 chiffres)';
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
        // Check if stands are available
        const availableStands = TOTAL_STANDS - currentReservations;
        if (availableStands <= 0) {
            alert('Désolé, il n\'y a plus de places disponibles pour les stands.');
            return;
        }
        
        // Try to send to API for admin tracking (non-blocking)
        try {
            const response = await fetch('/api/stand-reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                console.log('Reservation saved to database');
            } else {
                console.log('API call failed, but continuing with WhatsApp');
            }
        } catch (error) {
            console.log('API error, but continuing with WhatsApp:', error);
        }
        
        // Increment reservation count regardless of API success
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
    }
    
    function downloadReservationPDF(data) {
        const reservationNumber = 'RES-' + Date.now().toString().slice(-8);
        const currentDate = new Date().toLocaleDateString('fr-FR');
        
        const pdfContent = `
================================================================================
                    RÉSERVATION DE STAND - QUIZ ISLAMIQUE 2026
                              4ᵉ ÉDITION
================================================================================

NUMÉRO DE RÉSERVATION: ${reservationNumber}
DATE: ${currentDate}

================================================================================
INFORMATIONS DU RÉSERVATAIRE
================================================================================

Nom complet: ${data.nom}
Téléphone: ${data.telephone}
Email: ${data.email || 'Non renseigné'}

================================================================================
DÉTAILS DE L'ACTIVITÉ
================================================================================

Type d'activité: ${data.activite}
Nom de l'activité/entreprise: ${data.nom_activite}

Description:
${data.description}

Besoins spécifiques: ${data.besoins || 'Aucun'}

================================================================================
INFORMATIONS DE PAIEMENT
================================================================================

Montant: 10 000 FCFA
Méthode de paiement: Wave
Statut: Paiement confirmé par l'utilisateur

================================================================================
IMPORTANT
================================================================================

• Veuillez envoyer votre reçu de paiement via WhatsApp au +2250150070083
• Conservez ce document comme preuve de votre réservation
• Présentez ce document le jour de l'événement

================================================================================
CONTACTS
================================================================================

☎️ 07 79 38 22 33
☎️ 07 49 97 44 90
☎️ 07 89 03 60 52

================================================================================
                        LES SERVITEURS D'ALLAH (ASAA)
                            Quiz Islamique 2026
================================================================================
        `;
        
        const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reservation-stand-${reservationNumber}.txt`;
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
