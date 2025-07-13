import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar se a tabela teams existe
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('count')
      .limit(1);

    // Verificar se a tabela team_members existe
    const { data: teamMembersData, error: teamMembersError } = await supabase
      .from('team_members')
      .select('count')
      .limit(1);

    // Verificar se a tabela team_invitations existe
    const { data: teamInvitationsData, error: teamInvitationsError } = await supabase
      .from('team_invitations')
      .select('count')
      .limit(1);

    // Verificar se a coluna team_id existe na tabela companies
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('team_id')
      .limit(1);

    // Verificar se a coluna team_id existe na tabela leads
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('team_id')
      .limit(1);

    // Verificar se a coluna is_super_admin existe na tabela profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .limit(1);

    res.status(200).json({
      tables: {
        teams: {
          exists: !teamsError || !teamsError.message.includes('does not exist'),
          error: teamsError ? teamsError.message : null
        },
        team_members: {
          exists: !teamMembersError || !teamMembersError.message.includes('does not exist'),
          error: teamMembersError ? teamMembersError.message : null
        },
        team_invitations: {
          exists: !teamInvitationsError || !teamInvitationsError.message.includes('does not exist'),
          error: teamInvitationsError ? teamInvitationsError.message : null
        }
      },
      columns: {
        companies_team_id: {
          exists: !companiesError || !companiesError.message.includes('team_id'),
          error: companiesError ? companiesError.message : null
        },
        leads_team_id: {
          exists: !leadsError || !leadsError.message.includes('team_id'),
          error: leadsError ? leadsError.message : null
        },
        profiles_is_super_admin: {
          exists: !profilesError || !profilesError.message.includes('is_super_admin'),
          error: profilesError ? profilesError.message : null
        }
      }
    });
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    res.status(500).json({ error: 'Erro ao verificar tabelas' });
  }
} 