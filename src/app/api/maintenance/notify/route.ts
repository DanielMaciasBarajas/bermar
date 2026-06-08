import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { ticketId } = await request.json()
    const supabase = await createServiceClient()

    const { data: ticket } = await supabase
      .from('maintenance_tickets')
      .select('*, community:communities(moha_name, moha_whatsapp, liaison_whatsapp, liaison_email, moha_schedule)')
      .eq('id', ticketId)
      .single()

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const community = ticket.community as any
    const isPoolGarden = ticket.category === 'pool_garden'

    const message = `🔧 Bermar Maintenance Ticket #${ticketId.slice(-6).toUpperCase()}

Apt: ${ticket.apt_number}
Category: ${ticket.category.replace('_', ' ')}
Urgency: ${ticket.urgency.toUpperCase()}
Location: ${ticket.location_description || 'Not specified'}

${ticket.description}

${ticket.insurance_flag ? '⚠️ Insurance claim flagged' : ''}`

    const notifications = []

    // Send WhatsApp to Moha (pool/garden only)
    if (isPoolGarden && community?.moha_whatsapp && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilio = await import('twilio')
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await client.messages.create({
          body: `${message}\n\n[Pool/Garden — ${community.moha_name || 'Moha'}]`,
          from: process.env.TWILIO_WHATSAPP_FROM!,
          to: `whatsapp:${community.moha_whatsapp}`,
        })
        notifications.push('whatsapp_moha')
        await supabase.from('maintenance_tickets').update({ whatsapp_sent_moha: true }).eq('id', ticketId)
      } catch (e) {
        console.error('WhatsApp to Moha failed:', e)
      }
    }

    // Send WhatsApp to liaison
    if (community?.liaison_whatsapp && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilio = await import('twilio')
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_WHATSAPP_FROM!,
          to: `whatsapp:${community.liaison_whatsapp}`,
        })
        notifications.push('whatsapp_liaison')
        await supabase.from('maintenance_tickets').update({ whatsapp_sent_liaison: true }).eq('id', ticketId)
      } catch (e) {
        console.error('WhatsApp to liaison failed:', e)
      }
    }

    // Send email to liaison
    if (community?.liaison_email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@bermar.app',
          to: community.liaison_email,
          subject: `[Bermar] Maintenance ticket — Apt ${ticket.apt_number} — ${ticket.urgency.toUpperCase()}`,
          text: message,
        })
        notifications.push('email_liaison')
        await supabase.from('maintenance_tickets').update({ email_sent_liaison: true }).eq('id', ticketId)
      } catch (e) {
        console.error('Email to liaison failed:', e)
      }
    }

    return NextResponse.json({ success: true, sent: notifications })
  } catch (error) {
    console.error('Maintenance notify error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
