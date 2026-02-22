$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Rabail Ali Bhatti" -KeyUsage DigitalSignature -FriendlyName "CarbonCode Self-Signed Cert" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.17={text}upn=rabail@carboncode.local")
$password = ConvertTo-SecureString "password" -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath "carboncode_dist.pfx" -Password $password
Write-Host "Certificate generated: carboncode_dist.pfx"
