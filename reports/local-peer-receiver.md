# Local Peer Test - Receiver

- Status: PASS
- Started at: 2026-05-03T04:42:01.256Z
- Room: local-peer-mopaaduw
- URL: http://localhost:8787
- Error: none

## Actions
- Reset signaling room local-peer-mopaaduw
- Launch sender Chrome on CDP port 9331
- Launch receiver Chrome on CDP port 9332
- Opened sender client at http://localhost:8787
- Opened receiver client at http://localhost:8787
- Prepared receiver client with room local-peer-mopaaduw
- Prepared sender client with room local-peer-mopaaduw
- receiver clicked Connect Peer
- sender clicked Connect Peer
- Both peer DataChannels opened
- Sender sent sample resupply metadata frame
- Receiver decoded sample metadata frame
- Sender sent kill switch control frame
- Receiver decoded kill switch control frame

## Final UI State
- Server: Server: online
- Peer: Peer: connected
- STT: STT: idle
- Device: Source device: DEAD

## Transcript
```text

```

## Metadata
```text

```

## Binary
```text

```

## Receiver Metadata
```text
{
  "verified": true,
  "frame": {
    "0": 1,
    "1": 2,
    "2": "2026-05-03T04:42:03.872Z",
    "4": 2838512309,
    "5": 2,
    "6": {
      "1": "device_dead",
      "2": "sender",
      "3": "2026-05-03T04:42:03.872Z",
      "4": "Source device marked dead by operator."
    }
  },
  "payload": {
    "1": "device_dead",
    "2": "sender",
    "3": "2026-05-03T04:42:03.872Z",
    "4": "Source device marked dead by operator."
  }
}
```

## Receiver Summary
```text
SOURCE DEVICE DEAD. Treat sender as offline.
```

## Timeline
- 9:42:04 PM - Received kill switch 131 bytes
- 9:42:03 PM - Received 178 bytes
- 9:42:03 PM - Peer data channel opened
- 9:42:03 PM - Peer state: connected/connected
- 9:42:02 PM - Peer state: connecting/connected
- 9:42:02 PM - Peer state: connecting/connected
- 9:42:02 PM - Peer state: connecting/checking
- 9:42:02 PM - Peer state: new/checking

## Console
- none
