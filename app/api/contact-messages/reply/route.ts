import { NextResponse } from 'next/server';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import {
  createContactReply,
  deleteContactReply,
  findContactMessageById,
  updateContactReply,
} from '@/lib/cms/repository';
import { resolveAttachmentInput } from '@/lib/cms/attachment-utils';
import { sendContactReplyEmail } from '@/lib/email/send-reply';
import {
  logContactReplyDeleted,
  logContactReplySent,
  logContactReplyUpdated,
} from '@/lib/cms/activity-events';

export async function POST(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = body?.id;
  const reply = typeof body?.reply === 'string' ? body.reply.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const cc = typeof body?.cc === 'string' ? body.cc.trim() : '';

  if (id == null || id === '') {
    return NextResponse.json({ error: 'Message id is required.' }, { status: 400 });
  }
  if (!reply) {
    return NextResponse.json({ error: 'Please write a reply before sending.' }, { status: 400 });
  }

  try {
    const attachment = await resolveAttachmentInput(body?.attachment);

    const existing = await findContactMessageById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    const mailSubject = subject || existing.subject;
    const mail = await sendContactReplyEmail({
      to: existing.sender_email,
      toName: existing.sender_name,
      subject: mailSubject,
      replyText: reply,
      originalMessage: existing.body,
      originalFrom: existing.sender_email,
      originalDate: existing.created_at,
      cc: cc || undefined,
      attachment: attachment
        ? {
            name: attachment.name,
            mime: attachment.mime,
            contentBase64: attachment.contentBase64,
          }
        : undefined,
    });

    if (!mail.sent) {
      return NextResponse.json(
        { error: mail.reason || 'Could not send reply email.' },
        { status: 502 },
      );
    }

    const result = await createContactReply(id, {
      body: reply,
      subject: mailSubject,
      cc: cc || null,
      attachmentUrl: attachment?.attachmentUrl || null,
      attachmentName: attachment?.name || null,
      attachmentMime: attachment?.mime || null,
      attachmentSize: attachment?.size ?? null,
    });

    await logContactReplySent({
      auth,
      request,
      message: existing,
      reply: result.reply,
    });

    return NextResponse.json({ ok: true, message: result.message, reply: result.reply });
  } catch (error) {
    console.error('[contact-messages/reply]', error);
    return NextResponse.json(
      { error: error.message || 'Could not send reply.' },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const replyId = body?.replyId;
  const reply = typeof body?.reply === 'string' ? body.reply.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : undefined;
  const cc = typeof body?.cc === 'string' ? body.cc.trim() : undefined;
  const resend = body?.resend === true;
  const clearAttachment = body?.clearAttachment === true;

  if (!replyId) {
    return NextResponse.json({ error: 'Reply id is required.' }, { status: 400 });
  }
  if (!reply) {
    return NextResponse.json({ error: 'Reply text cannot be empty.' }, { status: 400 });
  }

  try {
    const attachment = clearAttachment ? null : await resolveAttachmentInput(body?.attachment);
    const patch = {
      body: reply,
      subject,
      cc,
    };
    if (clearAttachment) {
      patch.attachmentUrl = null;
      patch.attachmentName = null;
      patch.attachmentMime = null;
      patch.attachmentSize = null;
    } else if (attachment) {
      patch.attachmentUrl = attachment.attachmentUrl;
      patch.attachmentName = attachment.name;
      patch.attachmentMime = attachment.mime;
      patch.attachmentSize = attachment.size;
    }

    const result = await updateContactReply(replyId, patch);

    if (resend) {
      const messageId = result.message?.id;
      const existing = await findContactMessageById(messageId);
      if (existing) {
        const mail = await sendContactReplyEmail({
          to: existing.sender_email,
          toName: existing.sender_name,
          subject: subject || result.reply?.subject || existing.subject,
          replyText: reply,
          originalMessage: existing.body,
          originalFrom: existing.sender_email,
          originalDate: existing.created_at,
          cc: cc || result.reply?.cc || undefined,
          attachment: attachment
            ? {
                name: attachment.name,
                mime: attachment.mime,
                contentBase64: attachment.contentBase64,
              }
            : undefined,
        });
        if (!mail.sent) {
          return NextResponse.json(
            { error: mail.reason || 'Reply saved but email resend failed.', message: result.message, reply: result.reply },
            { status: 502 },
          );
        }
        await logContactReplySent({
          auth,
          request,
          message: existing,
          reply: result.reply,
          resend: true,
        });
      }
    } else {
      const messageId = result.message?.id;
      const existing = await findContactMessageById(messageId);
      if (existing) {
        await logContactReplyUpdated({
          auth,
          request,
          message: existing,
          reply: result.reply,
        });
      }
    }

    return NextResponse.json({ ok: true, message: result.message, reply: result.reply });
  } catch (error) {
    console.error('[contact-messages/reply PUT]', error);
    return NextResponse.json(
      { error: error.message || 'Could not update reply.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const replyId = body?.replyId;
  if (!replyId) {
    return NextResponse.json({ error: 'Reply id is required.' }, { status: 400 });
  }

  try {
    const result = await deleteContactReply(replyId);
    await logContactReplyDeleted({
      auth,
      request,
      message: result.message,
      replyId,
    });
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    console.error('[contact-messages/reply DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Could not delete reply.' },
      { status: 500 },
    );
  }
}
