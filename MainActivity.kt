package com.davidliams12.ticktube

import android.Manifest
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var myWebView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Create and Configure the WebView
        myWebView = WebView(this)
        myWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
        }
        
        myWebView.webViewClient = WebViewClient()
        setContentView(myWebView)

        // 2. Attach the Bridge (AndroidInterface)
        myWebView.addJavascriptInterface(WebAppInterface(this), "AndroidInterface")

        // 3. Load your TickTube Website
        myWebView.loadUrl("https://davidliams12.github.io/TickTube/")

        // 4. Ask for Storage Permissions immediately
        requestStoragePermissions()
    }

    private fun requestStoragePermissions() {
        val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.READ_MEDIA_VIDEO
        } else {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }

        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(permission), 100)
        }
    }

    // --- The Logic to Scan Storage ---
    fun fetchAllVideos(): String {
        val jsonArray = JSONArray()
        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME
        )

        val query = contentResolver.query(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            projection, null, null, null
        )

        query?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
            val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idCol)
                val name = cursor.getString(nameCol)
                val uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id).toString()

                val videoObj = JSONObject()
                videoObj.put("name", name)
                videoObj.put("uri", uri)
                jsonArray.put(videoObj)
            }
        }
        return jsonArray.toString()
    }

    // --- JavaScript Bridge ---
    inner class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun getOfflineVideos(): String {
            return fetchAllVideos()
        }
        
        @JavascriptInterface
        fun showToast(message: String) {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}
