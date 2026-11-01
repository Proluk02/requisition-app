<?php

namespace App\Notifications;

use App\Models\Requisition;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequisitionDisbursed extends Notification
{
    use Queueable;

    public function __construct(
        public Requisition $requisition
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->requisition->load([
            'demandes.justificatifs',
            'demandes.splits',
            'signatures.user',
            'project',
            'user',
        ]);

        $pdf = Pdf::loadView('pdf.requisition', ['requisition' => $this->requisition])
            ->setPaper('a4', 'landscape');

        $fileName = 'Requisition_' . str_replace('/', '-', $this->requisition->numero_requisition) . '_PAYE.pdf';

        return (new MailMessage)
            ->subject("Fonds décaissés : Réquisition {$this->requisition->numero_requisition}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Nous vous informons que les fonds pour votre réquisition **{$this->requisition->numero_requisition}** ont été décaissés avec succès.")
            ->line("Montant : **" . number_format($this->requisition->montant_total, 2, ',', ' ') . " {$this->requisition->devise}**")
            ->line("Référence de paiement : **{$this->requisition->reference_paiement}**")
            ->line("Guichet : **{$this->requisition->caisse_decaissement}**")
            ->line("Vous trouverez en pièce jointe le document PDF final estampillé « PAYÉ ».")
            ->action('Voir dans l\'application', route('dashboard'))
            ->attachData($pdf->output(), $fileName, [
                'mime' => 'application/pdf',
            ]);
    }
}