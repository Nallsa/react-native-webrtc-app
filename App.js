import React, {useEffect, useState, useRef, useLayoutEffect} from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import TextInputContainer from './components/TextInputContainer';
import SocketIOClient from 'socket.io-client';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCView,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import CallEnd from './asset/CallEnd';
import CallAnswer from './asset/CallAnswer';
import MicOn from './asset/MicOn';
import MicOff from './asset/MicOff';
import VideoOn from './asset/VideoOn';
import VideoOff from './asset/VideoOff';
import CameraSwitch from './asset/CameraSwitch';
import IconContainer from './components/IconContainer';
import InCallManager from 'react-native-incall-manager';
import {WebView} from 'react-native-webview';

// "react-native-webrtc": "^1.94.2",

export default function App({}) {
  const [localStream, setlocalStream] = useState(null);

  const [remoteStream, setRemoteStream] = useState(null);

  const [type, setType] = useState('JOIN');

  const [callerId] = useState(Math.floor(10 + Math.random() * 90).toString());
  const otherUserId = useRef(null);

  const socket = SocketIOClient('https://videotradedev.ru', {
    query: {
      callerId,
    },
  });

  // const peerConnection = useRef(
  //   new RTCPeerConnection({
  //     iceServers: [
  //       {
  //         urls: 'stun:stun.relay.metered.ca:80',
  //       },
  //       {
  //         urls: 'turn:a.relay.metered.ca:80',
  //         username: 'a06fa94e47b5b576b7e2023d',
  //         credential: 'kEj9B+JnstWL7jTI',
  //       },
  //       {
  //         urls: 'turn:a.relay.metered.ca:80?transport=tcp',
  //         username: 'a06fa94e47b5b576b7e2023d',
  //         credential: 'kEj9B+JnstWL7jTI',
  //       },
  //       {
  //         urls: 'turn:a.relay.metered.ca:443',
  //         username: 'a06fa94e47b5b576b7e2023d',
  //         credential: 'kEj9B+JnstWL7jTI',
  //       },
  //       {
  //         urls: 'turn:a.relay.metered.ca:443?transport=tcp',
  //         username: 'a06fa94e47b5b576b7e2023d',
  //         credential: 'kEj9B+JnstWL7jTI',
  //       },
  //     ],
  //   }),
  // );

  const peerConnection = useRef(
    new RTCPeerConnection({
      iceServers: [
        // {
        //   // urls: 'stun:oiweida.ru:3478',
        //   urls: 'stun:89.221.60.156:3478',
        // },
        {
          urls: 'stun:stun.l.google.com:19302',
        },
        {
          urls: 'turn:89.221.60.156:3478',
          username: 'andrew',
          credential: 'kapustin',
        },
        // {
        //   urls: 'turn:videotradedev.ru?transport=udp',
        //   username: 'andrew',
        //   credential: 'kapustin',
        // },
        // {
        //   urls: 'turn:89.221.60.156:3478?transport=tcp',
        //   username: 'andrew',
        //   credential: 'kapustin',
        // },
      ],
    }),
  );

  const [localMicOn, setlocalMicOn] = useState(true);

  const [localWebcamOn, setlocalWebcamOn] = useState(true);

  useEffect(() => {
    if (peerConnection.current && localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream);
      });
    }
  }, [peerConnection.current, localStream]);

  peerConnection.current?.addEventListener(
    'iceconnectionstatechange',
    event => {
      switch (peerConnection.current?.iceConnectionState) {
        case 'connected':
          console.log('connected');
        case 'completed':
          console.log('completed');
        case 'failed':
          console.log('failed');

          // You can handle the call being connected here.
          // Like setting the video streams to visible.

          break;
      }
    },
  );

  peerConnection.current?.addEventListener('connectionstatechange', event => {
    switch (peerConnection.current?.connectionState) {
      case 'closed':
        // You can handle the call being disconnected here.

        break;
    }
  });

  let remoteRTCMessage = useRef(null);

  useEffect(() => {
    socket.on('newCall', data => {
      remoteRTCMessage.current = data.rtcMessage;
      otherUserId.current = data.callerId;
      setType('INCOMING_CALL');
    });

    socket.on('callAnswered', data => {
      remoteRTCMessage.current = data.rtcMessage;

      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current),
      );
      setType('WEBRTC_ROOM');
    });

    socket.on('ICEcandidate', async data => {
      let message = data.rtcMessage;

      if (peerConnection.current) {
        peerConnection?.current
          .addIceCandidate(
            new RTCIceCandidate({
              candidate: message.candidate,
              sdpMid: message.id,
              sdpMLineIndex: message.label,
            }),
          )
          .then(data => {
            console.log('SUCCESS');
          })
          .catch(err => {
            console.log('Error', err);
          });
      }
    });

    let isFront = false;

    (async () => {
      (async () => {
        let mediaConstraints = {
          audio: true,
          video: true,
          //  {
          //   frameRate: 30,
          //   facingMode: 'environment', // Изменено здесь
          // },
        };

        let localMediaStream;
        let isVoiceOnly = false;

        try {
          const mediaStream = await mediaDevices.getUserMedia(mediaConstraints);

          if (isVoiceOnly) {
            let videoTrack = mediaStream.getVideoTracks()[0];
            videoTrack.enabled = false;
          }

          setlocalStream(mediaStream);
        } catch (err) {
          // Обработка ошибки
        }
      })();
    })();

    peerConnection.current?.addEventListener('addstream', event => {
      setRemoteStream(event.stream);
    });

    peerConnection.current?.addEventListener('icecandidate', event => {
      console.log('END', callerId, event.candidate);

      // if (!event.candidate) {
      //   console.log('END', event.candidate);
      //   return;
      // }
      if (event.candidate) {
        sendICEcandidate({
          calleeId: otherUserId.current,
          rtcMessage: {
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
          },
        });
      } else {
        console.log('End of candidates.');
      }
    });

    peerConnection.current?.addEventListener('icecandidateerror', event => {
      // You can ignore some candidate errors.
      // Connections can still be made even when errors occur.

      console.log('ENDevent', event);
    });

    return () => {
      socket.off('newCall');
      socket.off('callAnswered');
      socket.off('ICEcandidate');
    };
  }, []);

  useEffect(() => {
    InCallManager.start();
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(true);

    return () => {
      InCallManager.stop();
    };
  }, []);

  function sendICEcandidate(data) {
    socket.emit('ICEcandidate', data);
  }

  async function processCall() {
    let sessionConstraints = {
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true,
        VoiceActivityDetection: true,
      },
    };
    const sessionDescription =
      await peerConnection.current.createOffer(sessionConstraints);
    await peerConnection.current.setLocalDescription(sessionDescription);
    sendCall({
      calleeId: otherUserId.current,
      rtcMessage: sessionDescription,
    });
  }

  async function processAccept() {
    peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(remoteRTCMessage.current),
    );
    const sessionDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(sessionDescription);

    answerCall({
      callerId: otherUserId.current,
      rtcMessage: sessionDescription,
    });
  }

  function answerCall(data) {
    socket.emit('answerCall', data);
  }

  function sendCall(data) {
    socket.emit('call', data);
  }

  const JoinScreen = () => {
    '-5zeL1UKUNoPAPaIAABB';

    return <WebView source={{uri: 'https://nallsa.github.io/browseWebrtc/'}} />;
    // -5zeL1UKUNoPAPaIAABB
    // return (
    //   <KeyboardAvoidingView
    //     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    //     style={{
    //       flex: 1,
    //       backgroundColor: '#050A0E',
    //       justifyContent: 'center',
    //       paddingHorizontal: 42,
    //     }}>
    //     <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    //       <>
    //         <View
    //           style={{
    //             padding: 35,
    //             backgroundColor: '#1A1C22',
    //             justifyContent: 'center',
    //             alignItems: 'center',
    //             borderRadius: 14,
    //           }}>
    //           <Text
    //             style={{
    //               fontSize: 18,
    //               color: '#D0D4DD',
    //             }}>
    //             Your Caller ID
    //           </Text>
    //           <View
    //             style={{
    //               flexDirection: 'row',
    //               marginTop: 12,
    //               alignItems: 'center',
    //             }}>
    //             <Text
    //               style={{
    //                 fontSize: 32,
    //                 color: '#ffff',
    //                 letterSpacing: 6,
    //               }}>
    //               {callerId}
    //             </Text>
    //           </View>
    //         </View>

    //         <View
    //           style={{
    //             backgroundColor: '#1A1C22',
    //             padding: 40,
    //             marginTop: 25,
    //             justifyContent: 'center',
    //             borderRadius: 14,
    //           }}>
    //           <Text
    //             style={{
    //               fontSize: 18,
    //               color: '#D0D4DD',
    //             }}>
    //             Enter call id of another user
    //           </Text>
    //           <TextInputContainer
    //             placeholder={'Enter Caller ID'}
    //             value={otherUserId.current}
    //             setValue={text => {
    //               otherUserId.current = text;
    //               console.log('TEST', otherUserId.current);
    //             }}
    //             keyboardType={'number-pad'}
    //           />
    //           <TouchableOpacity
    //             onPress={() => {
    //               setType('OUTGOING_CALL');
    //               processCall();
    //             }}
    //             style={{
    //               height: 50,
    //               backgroundColor: '#5568FE',
    //               justifyContent: 'center',
    //               alignItems: 'center',
    //               borderRadius: 12,
    //               marginTop: 16,
    //             }}>
    //             <Text
    //               style={{
    //                 fontSize: 16,
    //                 color: '#FFFFFF',
    //               }}>
    //               Call Now
    //             </Text>
    //           </TouchableOpacity>
    //         </View>
    //       </>
    //     </TouchableWithoutFeedback>
    //   </KeyboardAvoidingView>
    // );
  };

  const OutgoingCallScreen = () => {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'space-around',
          backgroundColor: '#050A0E',
        }}>
        <View
          style={{
            padding: 35,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 14,
          }}>
          <Text
            style={{
              fontSize: 16,
              color: '#D0D4DD',
            }}>
            Calling to...
          </Text>

          <Text
            style={{
              fontSize: 36,
              marginTop: 12,
              color: '#ffff',
              letterSpacing: 6,
            }}>
            {otherUserId.current}
          </Text>
        </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={() => {
              setType('JOIN');
              otherUserId.current = null;
            }}
            style={{
              backgroundColor: '#FF5D5D',
              borderRadius: 30,
              height: 60,
              aspectRatio: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <CallEnd width={50} height={12} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const IncomingCallScreen = () => {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'space-around',
          backgroundColor: '#050A0E',
        }}>
        <View
          style={{
            padding: 35,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 14,
          }}>
          <Text
            style={{
              fontSize: 36,
              marginTop: 12,
              color: '#ffff',
            }}>
            {otherUserId.current} is calling..
          </Text>
        </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={() => {
              processAccept();
              setType('WEBRTC_ROOM');
            }}
            style={{
              backgroundColor: 'green',
              borderRadius: 30,
              height: 60,
              aspectRatio: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <CallAnswer height={28} fill={'#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  function switchCamera() {
    localStream.getVideoTracks().forEach(track => {
      track._switchCamera();
    });
  }

  function toggleCamera() {
    localWebcamOn ? setlocalWebcamOn(false) : setlocalWebcamOn(true);
    localStream.getVideoTracks().forEach(track => {
      localWebcamOn ? (track.enabled = false) : (track.enabled = true);
    });
  }

  function toggleMic() {
    localMicOn ? setlocalMicOn(false) : setlocalMicOn(true);
    localStream.getAudioTracks().forEach(track => {
      localMicOn ? (track.enabled = false) : (track.enabled = true);
    });
  }

  function leave() {
    peerConnection.current.close();
    setlocalStream(null);
    setType('JOIN');
  }

  const WebrtcRoomScreen = () => {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#050A0E',
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}>
        {localStream ? (
          <RTCView
            objectFit={'cover'}
            style={{flex: 1, backgroundColor: '#050A0E'}}
            streamURL={localStream.toURL()}
          />
        ) : null}
        {remoteStream ? (
          <RTCView
            objectFit={'cover'}
            style={{
              flex: 1,
              backgroundColor: '#050A0E',
              marginTop: 8,
            }}
            streamURL={remoteStream.toURL()}
          />
        ) : null}
        <View
          style={{
            marginVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}>
          <IconContainer
            backgroundColor={'red'}
            onPress={() => {
              leave();
            }}
            Icon={() => {
              return <CallEnd height={26} width={26} fill="#FFF" />;
            }}
          />
          <IconContainer
            style={{
              borderWidth: 1.5,
              borderColor: '#2B3034',
            }}
            backgroundColor={!localMicOn ? '#fff' : 'transparent'}
            onPress={() => {
              toggleMic();
            }}
            Icon={() => {
              return localMicOn ? (
                <MicOn height={24} width={24} fill="#FFF" />
              ) : (
                <MicOff height={28} width={28} fill="#1D2939" />
              );
            }}
          />
          <IconContainer
            style={{
              borderWidth: 1.5,
              borderColor: '#2B3034',
            }}
            backgroundColor={!localWebcamOn ? '#fff' : 'transparent'}
            onPress={() => {
              toggleCamera();
            }}
            Icon={() => {
              return localWebcamOn ? (
                <VideoOn height={24} width={24} fill="#FFF" />
              ) : (
                <VideoOff height={36} width={36} fill="#1D2939" />
              );
            }}
          />
          <IconContainer
            style={{
              borderWidth: 1.5,
              borderColor: '#2B3034',
            }}
            backgroundColor={'transparent'}
            onPress={() => {
              switchCamera();
            }}
            Icon={() => {
              return <CameraSwitch height={24} width={24} fill="#FFF" />;
            }}
          />
        </View>
      </View>
    );
  };

  switch (type) {
    case 'JOIN':
      return JoinScreen();
    case 'INCOMING_CALL':
      return IncomingCallScreen();
    case 'OUTGOING_CALL':
      return OutgoingCallScreen();
    case 'WEBRTC_ROOM':
      return WebrtcRoomScreen();
    default:
      return null;
  }
}
