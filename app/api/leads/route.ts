import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        company_id,
        companies:company_id (
          id,
          name
        )
      `)
      .order('name')
    
    if (error) {
      console.error('Erro ao buscar leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 