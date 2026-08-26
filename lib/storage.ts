/**
 * CDN Storage Service
 * Bu servis, resimleri uzak bir CDN sunucusuna (upload.php) yüklemek için kullanılır.
 */

export async function saveFile(data: string, folder: string = 'general'): Promise<string | null> {
   const CDN_UPLOAD_URL = process.env.CDN_UPLOAD_URL
   const CDN_UPLOAD_TOKEN = process.env.CDN_UPLOAD_TOKEN
   const CDN_BASE_URL = process.env.CDN_BASE_URL

   try {
      if (!data) return null
      
      // Eğer data zaten bir uzak URL ise (http...), direkt döndür
      if (data.startsWith('http') && !data.includes('base64')) {
         return data
      }

      // Base64 formatını kontrol et
      const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
         // Base64 değilse ve URL de değilse, ama yine de bir veri varsa
         // Eğer bir dosyaysa veya başka bir şeyse, null döndür (hata)
         return data.startsWith('data:') ? null : data 
      }

      const type = matches[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')
      
      const extension = type.split('/')[1] || 'png'
      const fileName = `upload_${Date.now()}.${extension}`

      if (!CDN_UPLOAD_URL) {
         console.error('CDN_UPLOAD_URL eksik!')
         return null
      }

      // FormData hazırla
      const formData = new FormData()
      const file = new File([buffer], fileName, { type })
      
      formData.append('file', file)
      formData.append('token', CDN_UPLOAD_TOKEN || '')
      formData.append('folder', folder)

      // CDN'e POST et
      const response = await fetch(CDN_UPLOAD_URL, {
         method: 'POST',
         body: formData,
      })

      if (!response.ok) {
         const errorText = await response.text()
         console.error('CDN upload error status:', response.status, errorText)
         return null
      }

      const result = await response.json()

      if (result.url) {
         let finalUrl = result.url
         if (!finalUrl.startsWith('http')) {
            finalUrl = `${CDN_BASE_URL}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`
         }
         return finalUrl
      }
      
      console.error('CDN response missing URL:', result)
      return null
   } catch (error) {
      console.error('Storage save error:', error)
      return null
   }
}

/**
 * Uzak CDN için silme işlemi (Eğer destekleniyorsa)
 */
export async function deleteFile(fileUrl: string): Promise<void> {
   // Uzak CDN silme API'si henüz tanımlanmadı.
   console.log('Delete requested for:', fileUrl)
}
