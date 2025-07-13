import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTextMessage, sendWhatsAppTemplateMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    // Obter dados do corpo da requisição
    const data = await request.json();
    const { phoneNumber, message, type = 'text', templateName, languageCode, components } = data;
    
    // Validar dados obrigatórios
    if (!phoneNumber) {
      return new NextResponse(JSON.stringify({ error: 'Número de telefone é obrigatório' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let response;
    
    // Enviar mensagem de acordo com o tipo
    if (type === 'template') {
      if (!templateName) {
        return new NextResponse(JSON.stringify({ error: 'Nome do template é obrigatório' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      response = await sendWhatsAppTemplateMessage(
        phoneNumber, 
        templateName, 
        languageCode || 'pt_BR',
        components
      );
    } else {
      // Tipo padrão: texto
      if (!message) {
        return new NextResponse(JSON.stringify({ error: 'Mensagem é obrigatória' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      response = await sendWhatsAppTextMessage(phoneNumber, message);
    }
    
    if (!response) {
      return new NextResponse(JSON.stringify({ error: 'Erro ao enviar mensagem' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new NextResponse(JSON.stringify({ success: true, data: response }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return new NextResponse(JSON.stringify({ error: 'Erro interno do servidor' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 