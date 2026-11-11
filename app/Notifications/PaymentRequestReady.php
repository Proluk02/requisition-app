<?php

namespace App\Notifications;

use App\Models\Requisition;
use App\Services\PaymentRequestDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentRequestReady extends Notification
{
    use Queueable;

    public function __construct(public Requisition $requisition) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $document = app(PaymentRequestDocument::class);

        return (new MailMessage)
            ->subject("Payment Request {$this->requisition->numero_requisition}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("La réquisition {$this->requisition->numero_requisition} a été approuvée par la Direction.")
            ->line('Qu\'il vous plaise de trouver ci-joint le Payment Request y relatif.')
            ->attachData(
                $document->render($this->requisition),
                $document->filename($this->requisition),
                ['mime' => 'application/pdf']
            );
    }
}
