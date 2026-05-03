# Local Peer Test - Receiver

- Status: PASS
- Started at: 2026-05-03T05:10:13.755Z
- Room: local-peer-mopbansr
- URL: http://10.1.60.244:8787
- Error: none

## Actions
- Reset signaling room local-peer-mopbansr
- Launch sender Chrome on CDP port 9331
- Launch receiver Chrome on CDP port 9332
- Opened sender client at http://10.1.60.244:8787
- Opened receiver client at http://10.1.60.244:8787
- Prepared receiver client with room local-peer-mopbansr
- Prepared sender client with room local-peer-mopbansr
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
    "2": "2026-05-03T05:10:16.478Z",
    "4": 146426499,
    "5": 2,
    "6": {
      "1": "device_dead",
      "2": "sender",
      "3": "2026-05-03T05:10:16.478Z",
      "4": "Source device marked dead by operator."
    }
  },
  "payload": {
    "1": "device_dead",
    "2": "sender",
    "3": "2026-05-03T05:10:16.478Z",
    "4": "Source device marked dead by operator."
  }
}
```

## Receiver Summary
```text
SOURCE DEVICE DEAD. Treat sender as offline.
```

## Timeline
- 10:10:16 PM - Received kill switch 131 bytes
- 10:10:16 PM - Received 178 bytes
- 10:10:15 PM - Peer data channel opened
- 10:10:15 PM - Peer state: connected/connected
- 10:10:15 PM - Peer state: connecting/connected
- 10:10:15 PM - Peer state: connecting/connected
- 10:10:15 PM - Peer state: connecting/checking
- 10:10:15 PM - Peer state: new/checking

## Console
- none
