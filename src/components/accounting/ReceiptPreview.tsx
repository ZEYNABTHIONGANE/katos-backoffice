import React, { useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { Invoice, PaymentHistory, Client, Project } from '../../types';

interface ReceiptPreviewProps {
    payment: PaymentHistory;
    invoice?: Invoice;
    client: Client;
    project?: Project;
    onClose: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
    payment,
    invoice,
    client,
    project,
    onClose
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = receiptRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Reçu de Paiement - ${payment.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .company-info h1 { margin: 0; color: #1a56db; font-size: 24px; }
            .receipt-title { text-align: right; }
            .receipt-title h2 { margin: 0; font-size: 28px; color: #444; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .value { font-size: 16px; font-weight: 500; }
            .amount-box { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 40px; border: 1px solid #e2e8f0; }
            .amount-label { font-size: 14px; color: #64748b; margin-bottom: 8px; }
            .amount-value { font-size: 36px; font-weight: bold; color: #1a56db; }
            .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>KATOS CONSTRUCTION</h1>
              <p>Dakar, Sénégal<br>Tel: +221 33 856 91 86<br>Email: contact@katosconsulting.com</p>
            </div>
            <div class="receipt-title">
              <h2>REÇU DE PAIEMENT</h2>
              <p>N° ${payment.id?.substring(0, 8).toUpperCase() || 'REF'}</p>
              <p>Date: ${payment.date ? new Date(payment.date.seconds * 1000).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="client-info">
              <div class="label">Reçu de</div>
              <div class="value">${client.nom} ${client.prenom}</div>
              <div class="value">${client.email}</div>
              ${client.telephone ? `<div class="value">${client.telephone}</div>` : ''}
            </div>
            <div class="project-info">
              <div class="label">Pour le projet</div>
              <div class="value">${project?.name || 'Projet'}</div>
              <div class="value">${project?.type || ''}</div>
            </div>
          </div>

          <div class="amount-box">
             <div class="amount-label">MONTANT PAYÉ</div>
             <div class="amount-value">${new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(payment.amount)} FCFA</div>
             <div class="amount-label" style="margin-top: 10px; font-size: 12px;">Mode de paiement: ${payment.method}</div>
             ${payment.reference ? `<div class="amount-label" style="font-size: 12px;">Ref: ${payment.reference}</div>` : ''}
          </div>

          <div class="footer">
            <p>Ce reçu est généré électroniquement et est valide sans signature.</p>
            <p>Merci pour votre confiance.</p>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-lg">Aperçu du Reçu</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 flex-1 bg-white" ref={receiptRef}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b pb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-blue-800">KATOS CONSTRUCTION</h1>
                            <div className="text-sm text-gray-500 mt-2">
                                <p>Dakar, Almadies</p>
                                <p>Tel: +221 33 856 91 86 </p>
                                <p>Email: contact@katosconsulting.com</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-800">REÇU DE PAIEMENT</h2>
                            <div className="text-sm text-gray-500 mt-2">
                                <p>N° {payment.id?.substring(0, 8).toUpperCase() || 'REF'}</p>
                                <p>Date: {payment.date ? new Date(payment.date.seconds * 1000).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Client & Projet */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reçu de</p>
                            <p className="font-medium text-gray-900">{client.nom} {client.prenom}</p>
                            <p className="text-gray-600">{client.email}</p>
                            {client.telephone && <p className="text-gray-600">{client.telephone}</p>}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pour le projet</p>
                            <p className="font-medium text-gray-900">{project?.name || 'Projet'}</p>
                            <p className="text-gray-600">{project?.type || ''}</p>
                        </div>
                    </div>

                    {/* Montant */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center mb-8">
                        <p className="text-sm text-slate-500 mb-2">MONTANT PAYÉ</p>
                        <p className="text-4xl font-bold text-blue-600">
                            {new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(payment.amount)} FCFA
                        </p>
                        <div className="mt-4 flex justify-center gap-4 text-sm text-slate-500">
                            <span>Mode: <span className="font-medium text-slate-700 capitalize">{payment.method}</span></span>
                            {payment.reference && <span>Ref: <span className="font-medium text-slate-700">{payment.reference}</span></span>}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
                        <p>Ce reçu est généré électroniquement et est valide sans signature.</p>
                        <p>Merci pour votre confiance.</p>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                    <Button onClick={handlePrint} className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        Imprimer / Télécharger
                    </Button>
                </div>
            </Card>
        </div>
    );
};
