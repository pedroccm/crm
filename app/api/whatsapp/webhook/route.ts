import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppWebhook } from '@/lib/whatsapp';
import { fetchWhatsAppSettings } from '@/lib/whatsapp-settings-service';

// Token de verificação do webhook (será substituído pelo valor do banco de dados)
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Buscar token de verificação das configurações
    let verifyToken = WEBHOOK_VERIFY_TOKEN;
    try {
      const settings = await fetchWhatsAppSettings();
      if (settings?.verify_token) {
        verifyToken = settings.verify_token;
      }
    } catch (error) {
      console.error('Erro ao buscar configurações do WhatsApp:', error);
      // Continua usando o token do .env se houver erro
    }

    // Verificar se é uma solicitação de verificação do webhook
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verificado com sucesso!');
      return new NextResponse(challenge, { status: 200 });
    } else {
      // Token inválido
      console.error('Falha na verificação do webhook, token inválido');
      return new NextResponse('Verificação falhou', { status: 403 });
    }
  } catch (error) {
    console.error('Erro ao processar verificação do webhook:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obter dados do corpo da requisição
    const webhookData = await request.json();
    
    // Registrar webhook para depuração
    console.log('Webhook recebido:', JSON.stringify(webhookData, null, 2));
    
    // Processar o webhook
    await processWhatsAppWebhook(webhookData);
    
    // Responder com sucesso (o WhatsApp espera uma resposta 200 OK)
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
} 