package com.Davidliams12.Ticktube // Ensure this matches your project package name

import android.Manifest
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var myWebView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 1. Initialize WebView
        myWebView = WebView(this)
        setContentView(myWebView)

        // 2. Configure WebView Settings
        myWebView.settings.javaScriptEnabled = true
        myWebView.settings.domStorageEnabled = true
        myWebView.settings.allowFileAccess = true
        myWebView.webViewClient = WebViewClient()

        // 3. Add the Bridge (Connects Kotlin to your ticktube.js)
        myWebView.addJavascriptInterface(WebAppInterface(this), "AndroidInterface")

        // 4. Load your GitHub URL or local assets
        myWebView.loadUrl("https://yourusername.github.io/TickTube/") 

        // 5. Check Permissions for Video Access
        checkVideoPermissions()
    }

    private fun checkVideoPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE), 101)
        }
    }

    // --- The Core Video Fetching Logic ---
    fun fetchAllOfflineVideos(): String {
        val videoList = JSONArray()
        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME
        )

        val query = contentResolver.query(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            projection, null, null, null
        )

        query?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
            val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val name = cursor.getString(nameColumn)
                val uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id).toString()

                val videoJson = JSONObject()
                videoJson.put("name", name)
                videoJson.put("uri", uri)
                videoList.put(videoJson)
            }
        }
        return videoList.toString()
    }

    // --- The JavaScript Bridge Class ---
    inner class WebAppInterface(private val mContext: Context) {
        @JavascriptInterface
        fun getOfflineVideos(): String {
            return fetchAllOfflineVideos()
        }
    }
}
