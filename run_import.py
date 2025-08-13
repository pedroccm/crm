#!/usr/bin/env python3
"""
Script simplificado para executar a importação de studios
"""

import subprocess
import sys
import os

def install_requirements():
    """Instala as dependências necessárias"""
    print("📦 Instalando dependências...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependências instaladas!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar dependências: {e}")
        return False

def run_import():
    """Executa a importação"""
    print("\n🚀 Executando importação de Studios...")
    try:
        subprocess.check_call([sys.executable, "import_studios.py"])
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro na importação: {e}")
        return False

def main():
    print("🎯 IMPORTAÇÃO DE STUDIOS PARA CRM")
    print("=" * 50)
    
    # Verificar se o arquivo existe
    if not os.path.exists('import_studios.py'):
        print("❌ Arquivo import_studios.py não encontrado!")
        return
    
    print("📋 CONFIGURAÇÕES:")
    print("✅ Banco de Studios: afbyaucsrjsdjwhrlbbk.supabase.co")
    print("✅ Banco do CRM: mpkbljfudwznidtzyywf.supabase.co") 
    print("✅ Team ID: 4077b6d9-6d5d-4cff-ab32-c3f3f6310d5f")
    print("✅ Campos personalizados: Serão criados automaticamente")
    
    # Instalar dependências
    if not install_requirements():
        return
    
    # Confirmar execução
    confirm = input("\n✅ Confirma a importação? (s/N): ").strip().lower()
    
    if confirm in ['s', 'sim', 'y', 'yes']:
        if run_import():
            print("\n🎉 Importação concluída com sucesso!")
        else:
            print("\n❌ Importação falhou")
    else:
        print("❌ Importação cancelada")

if __name__ == "__main__":
    main()