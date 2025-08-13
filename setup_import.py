#!/usr/bin/env python3
"""
Script para configurar e executar a importação de studios
"""

import os
import subprocess
import sys

def install_requirements():
    """Instala as dependências necessárias"""
    print("📦 Instalando dependências...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependências instaladas!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar dependências: {e}")
        return False
    return True

def get_crm_config():
    """Solicita as configurações do CRM ao usuário"""
    print("\n🔧 CONFIGURAÇÃO DO CRM")
    print("=" * 40)
    
    print("\n1️⃣ Vá para o Supabase do seu CRM")
    print("2️⃣ Settings → API → URL e service_role key")
    
    crm_url = input("\n🔗 URL do Supabase CRM: ").strip()
    crm_key = input("🔑 Service Role Key do CRM: ").strip()
    
    print("\n3️⃣ Vá para a tabela 'teams' e copie o ID do seu time")
    team_id = input("👥 ID do Time (UUID): ").strip()
    
    return crm_url, crm_key, team_id

def update_import_script(crm_url, crm_key, team_id):
    """Atualiza o script de importação com as configurações"""
    try:
        with open('import_studios.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Substituir as configurações
        content = content.replace('CRM_SUPABASE_URL = "SUA_URL_AQUI"', f'CRM_SUPABASE_URL = "{crm_url}"')
        content = content.replace('CRM_SUPABASE_KEY = "SUA_KEY_AQUI"', f'CRM_SUPABASE_KEY = "{crm_key}"')
        content = content.replace('TARGET_TEAM_ID = "SEU_TEAM_ID_AQUI"', f'TARGET_TEAM_ID = "{team_id}"')
        
        with open('import_studios.py', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Script configurado!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao configurar script: {e}")
        return False

def run_import():
    """Executa a importação"""
    print("\n🚀 Executando importação...")
    try:
        subprocess.check_call([sys.executable, "import_studios.py"])
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro na importação: {e}")
        return False
    return True

def main():
    print("🎯 SETUP DE IMPORTAÇÃO DE STUDIOS")
    print("=" * 50)
    
    # Verificar se o arquivo existe
    if not os.path.exists('import_studios.py'):
        print("❌ Arquivo import_studios.py não encontrado!")
        return
    
    # Instalar dependências
    if not install_requirements():
        return
    
    # Obter configurações
    crm_url, crm_key, team_id = get_crm_config()
    
    if not all([crm_url, crm_key, team_id]):
        print("❌ Todas as configurações são obrigatórias!")
        return
    
    # Atualizar script
    if not update_import_script(crm_url, crm_key, team_id):
        return
    
    # Confirmar execução
    print(f"\n📋 RESUMO DA CONFIGURAÇÃO:")
    print(f"🔗 URL do CRM: {crm_url}")
    print(f"👥 Team ID: {team_id}")
    print(f"🔑 Key: {crm_key[:20]}...")
    
    confirm = input("\n✅ Confirma a importação? (s/N): ").strip().lower()
    
    if confirm in ['s', 'sim', 'y', 'yes']:
        run_import()
        print("\n🎉 Processo concluído!")
    else:
        print("❌ Importação cancelada")

if __name__ == "__main__":
    main()