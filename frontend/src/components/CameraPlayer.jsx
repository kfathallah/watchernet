import VideoPlayer from './VideoPlayer'

/**
 * Compatibility wrapper kept to avoid breaking existing imports/tests.
 */
export default function CameraPlayer(props) {
  return <VideoPlayer {...props} />
}
