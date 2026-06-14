#[tauri::command]
async fn download_youtube_audio(url: String) -> Result<Vec<u8>, String> {
    use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};

    let options = VideoOptions {
        quality: VideoQuality::HighestAudio,
        filter: VideoSearchOptions::AudioOnly,
        ..Default::default()
    };

    let video = Video::new_with_options(url, options).map_err(|e| e.to_string())?;
    let audio_buffer = video.download().await.map_err(|e| e.to_string())?;

    Ok(audio_buffer)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
    .invoke_handler(tauri::generate_handler![download_youtube_audio])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
