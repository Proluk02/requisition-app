<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Réquisition prête pour le décaissement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #0f172a; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 10px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #0B192C; padding: 26px 32px; border-bottom: 4px solid #F58F20;">
                            <div style="color: #ffffff; font-size: 17px; font-weight: bold; letter-spacing: 0.2px;">Bon Pasteur Kolwezi</div>
                            <div style="margin-top: 5px; color: #B2BED6; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Système de Gestion des Réquisitions</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 34px 32px 20px;">
                            <div style="display: inline-block; margin-bottom: 18px; padding: 7px 11px; border-radius: 4px; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: bold;">
                                APPROUVÉE — PRÊTE POUR LA CAISSE
                            </div>
                            <h1 style="margin: 0 0 14px; color: #0B192C; font-size: 23px; line-height: 1.3;">Bonjour {{ $initiatorName }},</h1>
                            <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">
                                Votre réquisition a été approuvée et transmise à la caisse. Elle est maintenant prête pour le décaissement.
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 13px 16px; color: #64748b; font-size: 13px;">Numéro de réquisition</td>
                                    <td align="right" style="padding: 13px 16px; color: #04326D; font-size: 14px; font-weight: bold;">{{ $numero }}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td style="padding: 13px 16px; color: #64748b; font-size: 13px;">Montant</td>
                                    <td align="right" style="padding: 13px 16px; color: #04326D; font-size: 14px; font-weight: bold;">{{ $montant }} {{ $devise }}</td>
                                </tr>
                                @if ($caisse)
                                    <tr>
                                        <td colspan="2" style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 13px 16px; color: #64748b; font-size: 13px;">Caisse prévue</td>
                                        <td align="right" style="padding: 13px 16px; color: #04326D; font-size: 14px; font-weight: bold;">{{ $caisse }}</td>
                                    </tr>
                                @endif
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 26px 0 18px;">
                                <tr>
                                    <td align="center" style="border-radius: 5px; background-color: #04326D;">
                                        <a href="{{ $requisitionsUrl }}" style="display: inline-block; padding: 13px 20px; color: #ffffff; font-size: 14px; font-weight: bold; text-decoration: none;">Consulter mes réquisitions</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                                Pour toute question concernant le retrait des fonds, veuillez contacter le service de la caisse.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.6;">
                            Message automatique envoyé par le Système de Gestion des Réquisitions de Bon Pasteur Kolwezi. Merci de ne pas répondre directement à cet e-mail.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
