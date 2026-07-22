// Stand Reservation Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('standReservationForm');
    const receiptSection = document.getElementById('receiptSection');
    const successMessage = document.getElementById('successMessage');
    
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
        try {
            const response = await fetch('/api/stand-reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Show success message
                successMessage.classList.add('active');
                
                // Show WhatsApp section with pre-filled message
                receiptSection.classList.add('active');
                setupWhatsAppButton(data);
                
                // Hide form
                form.style.display = 'none';
                
                // Scroll to success message
                successMessage.scrollIntoView({ behavior: 'smooth' });
            } else {
                const error = await response.json();
                alert('Erreur lors de la soumission: ' + (error.message || 'Veuillez réessayer'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Erreur de connexion. Veuillez vérifier votre internet et réessayer.');
        }
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
