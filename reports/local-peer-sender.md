# Local Peer Test - Sender

- Status: PASS
- Started at: 2026-05-03T04:55:08.959Z
- Room: local-peer-mopar9nj
- URL: http://localhost:8787
- Error: none

## Actions
- Reset signaling room local-peer-mopar9nj
- Launch sender Chrome on CDP port 9331
- Launch receiver Chrome on CDP port 9332
- Opened sender client at http://localhost:8787
- Opened receiver client at http://localhost:8787
- Prepared receiver client with room local-peer-mopar9nj
- Prepared sender client with room local-peer-mopar9nj
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
- Device: Source device: alive

## Transcript
```text
Alpha Two is at grid 12345678, one casualty, low ammo, requesting resupply at checkpoint Bravo.
```

## Metadata
```text
{
  "control": "device_dead",
  "payload": {
    "1": "device_dead",
    "2": "sender",
    "3": "2026-05-03T04:55:11.495Z",
    "4": "Source device marked dead by operator."
  }
}
```

## Binary
```text
131 bytes
a6 00 01 01 02 02 78 18 32 30 32 36 2d 30 35 2d 30 33 54 30 34 3a 35 35 3a 31 31 2e 34 39 35 5a 04 1a cf 19 ba a1 05 02 06 a4 01 6b 64 65 76 69 63 65 5f 64 65 61 64 02 66 73 65 6e 64 65 72 03 78 18 32 30 32 36 2d 30 35 2d 30 33 54 30 34 3a 35 35 3a 31 31 2e 34 39 35 5a 04 78 26 53 6f 75 72 63 65 20 64 65 76 69 63 65 20 6d 61 72 6b 65 64 20 64 65 61 64 20 62 79 20 6f 70 65 72 61 74 6f 72 2e
```

## Receiver Metadata
```text

```

## Receiver Summary
```text

```

## Timeline
- 9:55:11 PM - Sent 131 bytes
- 9:55:11 PM - Queued 131 bytes for 486 ms
- 9:55:11 PM - Kill switch control frame built
- 9:55:11 PM - Sent 178 bytes
- 9:55:10 PM - Queued 178 bytes for 516 ms
- 9:55:10 PM - Mission metadata extracted
- 9:55:10 PM - Peer data channel opened
- 9:55:10 PM - Peer state: connected/connected

## Console
- none
