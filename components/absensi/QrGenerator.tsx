"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QrGenerator() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const generateQr = async () => {
    // Placeholder: akan menggunakan package `qrcode` untuk generate QR image
    setQrUrl("https://via.placeholder.com/300x300?text=QR+Code");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate QR Absensi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={generateQr}>Generate QR</Button>
        {qrUrl && (
          <div className="flex justify-center">
            <img src={qrUrl} alt="QR Code" className="rounded-lg border" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
