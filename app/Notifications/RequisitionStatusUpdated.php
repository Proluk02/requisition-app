<?php

namespace App\Notifications;

use App\Models\Requisition;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequisitionStatusUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public Requisition $requisition,
        public string $action, // ex: 'approuvée' ou 'rejetée'
        public string $etape,  // ex: 'Département des Finances'
        public ?string $commentaire = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $initiateur = $this->requisition->user;

        $mail = (new MailMessage)
            ->subject("Mise à jour Réquisition {$this->requisition->numero_requisition} - {$this->action}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("La réquisition **{$this->requisition->numero_requisition}** initiée par **" . ($initiateur->name ?? 'Inconnu') . "** a été **{$this->action}** à l'étape : **{$this->etape}**.")
            ->line("Montant : **" . number_format($this->requisition->montant_total, 2, ',', ' ') . " {$this->requisition->devise}**");

        if (!empty($this->commentaire)) {
            $mail->line("Commentaire / Motif : {$this->commentaire}");
        }

        $mail->action('Consulter la réquisition', route('dashboard'));
        
        if (
            $notifiable instanceof User && 
            $notifiable->hasRole('project_manager') && 
            $initiateur && 
            !empty($initiateur->email) && 
            $initiateur->email !== $notifiable->email
        ) {
            $mail->bcc($initiateur->email, $initiateur->name);
        }

        return $mail;
    }
}