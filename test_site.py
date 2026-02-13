#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de test pour vérifier le bon fonctionnement du site Quiz Islamique 2026
Usage: python test_site.py [URL]
Exemple: python test_site.py https://preselection-qi26.onrender.com
"""

import sys
import io
import requests
import json
from urllib.parse import urlparse

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_endpoint(url, endpoint, method="GET", description="", auth=None, json_data=None):
    """Teste un endpoint de l'API"""
    full_url = f"{url}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(full_url, auth=auth, timeout=30)
        elif method == "POST":
            response = requests.post(full_url, auth=auth, json=json_data, timeout=30)

        status = "✅" if response.status_code < 400 else "❌"
        print(f"{status} [{response.status_code}] {method} {endpoint} - {description}")

        if response.status_code >= 400:
            try:
                error_data = response.json()
                print(f"   Erreur: {error_data.get('error', error_data.get('message', 'Inconnue'))}")
            except:
                print(f"   Erreur: {response.text[:200]}")

        return response.status_code < 400
    except requests.exceptions.Timeout:
        print(f"⏱️  TIMEOUT {method} {endpoint} - {description}")
        return False
    except Exception as e:
        print(f"❌ ERREUR {method} {endpoint} - {str(e)[:100]}")
        return False

def main():
    # URL du site (par défaut Render)
    url = sys.argv[1] if len(sys.argv) > 1 else "https://preselection-qi26.onrender.com"

    # Supprimer le trailing slash
    url = url.rstrip("/")

    print("=" * 60)
    print(f"🧪 Test du site Quiz Islamique 2026")
    print(f"📍 URL: {url}")
    print("=" * 60)
    print()

    # Identifiants admin par défaut
    admin_user = "asaa2026"
    admin_pass = "ASAALMO2026"
    auth = (admin_user, admin_pass)

    results = []

    # Tests des pages HTML
    print("📄 Pages HTML")
    results.append(test_endpoint(url, "/", description="Page d'accueil"))
    results.append(test_endpoint(url, "/admin.html", description="Page admin"))
    results.append(test_endpoint(url, "/candidats.html", description="Galerie des candidats"))
    results.append(test_endpoint(url, "/resultats.html", description="Page résultats"))
    results.append(test_endpoint(url, "/dashboard.html", description="Dashboard"))
    print()

    # Tests des endpoints API publics
    print("🌐 API Publique")
    results.append(test_endpoint(url, "/api/health", description="Santé du serveur"))
    results.append(test_endpoint(url, "/api/public-settings", description="Paramètres publics"))
    results.append(test_endpoint(url, "/api/public-candidates", description="Liste des candidats"))
    results.append(test_endpoint(url, "/api/public-results", description="Résultats publics"))
    print()

    # Tests des endpoints API admin
    print("🔐 API Admin (authentification requise)")
    results.append(test_endpoint(url, "/api/admin/dashboard", auth=auth, description="Dashboard admin"))
    results.append(test_endpoint(url, "/api/candidates", auth=auth, description="Candidats (admin)"))
    results.append(test_endpoint(url, "/api/votes/summary", auth=auth, description="Résumé des votes"))
    results.append(test_endpoint(url, "/api/scores/ranking", auth=auth, description="Classement par scores"))
    results.append(test_endpoint(url, "/api/tournament-settings", auth=auth, description="Paramètres du tournoi"))
    print()

    # Résumé
    success_count = sum(results)
    total_count = len(results)
    success_rate = (success_count / total_count * 100) if total_count > 0 else 0

    print("=" * 60)
    print(f"📊 Résumé: {success_count}/{total_count} tests réussis ({success_rate:.1f}%)")
    print("=" * 60)

    if success_rate >= 90:
        print("✅ Le site fonctionne correctement!")
    elif success_rate >= 70:
        print("⚠️  Le site fonctionne partiellement - vérifiez les erreurs ci-dessus")
    else:
        print("❌ Le site a des problèmes majeurs - consultez GUIDE_DEPANNAGE.md")

    print()
    print("💡 Conseils:")
    print("   - Si timeout: la base de données Render (Free tier) est en veille")
    print("   - Attendez 30-60s et réessayez")
    print("   - Si erreur DB: vérifiez DATABASE_EXTERNAL_URL dans Render")
    print("   - Consultez GUIDE_DEPANNAGE.md pour plus d'infos")

    return 0 if success_rate >= 70 else 1

if __name__ == "__main__":
    sys.exit(main())
