<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { LottieView } from '@nativescript-community/ui-lottie';
    import { AndroidActivityBackPressedEventData, Application, Color, Page } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { onDestroy, onMount } from 'svelte';
    import { lc } from '~/helpers/locale';
    import { getRealTheme } from '~/helpers/theme';
    import { securityService } from '~/services/security';
    import { onBackButton } from '~/utils/ui';
    import { colors } from '~/variables';

    $: ({ colorOnBackground, colorPrimary, colorPrimaryContainer } = $colors);

    enum State {
        CurrentPasswordQuery,
        PasswordQuery,
        ConfirmPasswordQuery
    }

    export let creation: boolean = false;
    export let change = false;
    export let closeOnBack = false;
    export let allowClose = false;
    export let storePassword: string;

    let page: NativeViewElementNode<Page>;
    let lottieView: NativeViewElementNode<LottieView>;
    let title: string = null;
    let message: string = null;
    let state: State = null;
    let oldPasscode: string;

    let firstLayout = true;
    let passCodeArray = [];
    let passCodeConfirmationArray = [];

    let lottieDarkFColor;
    let lottieLightColor;
    $: {
        if (colorPrimaryContainer) {
            lottieDarkFColor = new Color(colorPrimaryContainer);
            const realTheme = getRealTheme();
            if (realTheme === 'light') {
                lottieLightColor = new Color(colorPrimaryContainer).darken(10);
            } else {
                lottieLightColor = new Color(colorPrimaryContainer).lighten(10);
            }
        }
    }

    onMount(() => {
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        if (change) {
            state = State.CurrentPasswordQuery;
        } else {
            state = State.PasswordQuery;
        }
        title = creation ? lc('passcode_creation') : lc('enter_passcode');
        updateMessage();
    });
    onDestroy(() => {
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
    });

    const onAndroidBackButton = (data: AndroidActivityBackPressedEventData) =>
        onBackButton(page?.nativeView, () => {
            if (creation || change) {
                data.cancel = true;
            } else if (closeOnBack) {
                Application.android.startActivity.finish();
            }
        });
    async function onLayoutChanged() {
        if (!firstLayout) {
            return;
        }
        firstLayout = false;
        if (securityService.biometricEnabled) {
            setTimeout(async () => {
                try {
                    const result = await securityService.verifyFingerprint();
                    if (result) {
                        closeModal({ validated: true });
                    }
                } catch (error) {
                    if (closeOnBack && (error.code === 50 || error.code === 60 || error.code === -3)) {
                        if (__ANDROID__) {
                            Application.android.startActivity.finish();
                        }
                    } else {
                        closeModal({ validated: false });
                    }
                }
            }, 500);
        }
    }

    function currentArray() {
        if (state === State.ConfirmPasswordQuery) {
            return passCodeConfirmationArray;
        }
        return passCodeArray;
    }

    function onTextChange(i: number, text: string) {
        // console.log('onTextChange', i, text);
        // if (text && text.length) {
        //     passCodeArray[i] = text[0];
        //     if ( i < 3) {
        //         $refs['field' + (i + 1)].nativeView.requestFocus();
        //     } else {
        //         $refs['field' + (i)].nativeView.blur();
        //     }
        // }
    }

    function updateMessage() {
        switch (state) {
            case State.CurrentPasswordQuery:
                message = lc('current_passcode');
                break;
            case State.PasswordQuery:
                if (change) {
                    message = lc('new_passcode');
                } else if (creation) {
                    message = lc('enter_passcode');
                } else {
                    message = null;
                }
                break;
            case State.ConfirmPasswordQuery:
                message = lc('confirm_passcode');
                break;
        }
    }
    function clear() {
        passCodeArray = [];
        passCodeConfirmationArray = [];
        updateMessage();
    }
    function setState(state: State) {
        if (state !== state) {
            state = state;
            switch (state) {
                case State.CurrentPasswordQuery:
                    passCodeArray = [];
                    break;
                case State.PasswordQuery:
                    passCodeArray = [];
                    passCodeConfirmationArray = [];
                    break;
                case State.ConfirmPasswordQuery:
                    passCodeConfirmationArray = [];
                    break;
            }
        }
    }
    function passwordsMatches() {
        return passCodeArray.join('') === passCodeConfirmationArray.join('');
    }
    function onButtonTap(str: string) {
        // console.log('onButtonTap', str, confirmingPassword, passCodeArray.length, passCodeConfirmationArray.length);

        if (state === State.ConfirmPasswordQuery) {
            if (passCodeConfirmationArray.length < 4) {
                passCodeConfirmationArray.push(str);
            }
            if (passCodeConfirmationArray.length === 4) {
                if (passwordsMatches()) {
                    closeModal({ oldPasscode, passcode: passCodeArray.join('') });
                } else {
                    message = lc('confirm_passcode_dont_match');
                    setTimeout(() => {
                        if (change) {
                            closeModal(null);
                        } else {
                            setState(State.PasswordQuery);
                        }
                    }, 50);
                    setTimeout(() => {
                        updateMessage();
                    }, 2000);
                }
            }
        } else {
            if (passCodeArray.length < 4) {
                passCodeArray.push(str);
            }
            if (passCodeArray.length === 4) {
                switch (state) {
                    case State.CurrentPasswordQuery:
                        const current = passCodeArray.join('');
                        if (storePassword === current) {
                            oldPasscode = current;
                            setState(State.PasswordQuery);
                            updateMessage();
                        } else {
                            message = lc('wrong_passcode');
                            setTimeout(() => {
                                closeModal(null);
                            }, 50);
                        }
                        break;
                    case State.PasswordQuery:
                        if (creation || change) {
                            setTimeout(() => {
                                setState(State.ConfirmPasswordQuery);
                                updateMessage();
                            }, 50);
                        } else {
                            const current = passCodeArray.join('');
                            if (allowClose) {
                                closeModal({ passcode: current });
                            } else if (storePassword === current) {
                                closeModal({ passcode: current });
                            } else {
                                message = lc('wrong_passcode');

                                setTimeout(() => {
                                    updateMessage();
                                }, 1000);
                                setTimeout(() => {
                                    passCodeArray = [];
                                }, 50);
                            }
                        }
                        break;
                }
            }
        }
        // console.log('onButtonTap done ', str, confirmingPassword, passCodeArray, passCodeConfirmationArray);
    }
</script>

<page bind:this={page} id="passCodeWindow" actionBarHidden={true}>
    {#if securityService.pincodeEnabled}
        <gridlayout class="pageContent" columns="*,*,*" rows="3*,*,*,*,*" on:layoutChanged={onLayoutChanged}>
            <gridlayout backgroundColor={colorPrimary} colSpan={3} columns="*,*,*,*" row={0}>
                {#each { length: 4 } as _, i (i)}
                    <label
                        id={'field' + i}
                        backgroundColor="white"
                        borderColor="black"
                        borderRadius={4}
                        col={i - 1}
                        fontSize={50}
                        height={80}
                        isUserInteractionEnabled={false}
                        margin="0 10 0 10"
                        text={currentArray[i - 1] !== undefined ? '•' : ' '}
                        textAlignment="center"
                        verticalAlignment="center"
                        verticalTextAlignment="center"
                    />
                {/each}

                <label colSpan={4} color="white" fontSize={18} fontWeight="bold" paddingTop={30} text={title} textAlignment="center" verticalAlignment="top" />
                <label colSpan={4} color="white" fontSize={16} fontWeight="bold" paddingBottom={30} text={message} textAlignment="center" verticalAlignment="bottom" />
            </gridlayout>
            {#each { length: 10 } as _, j (j)}
                <uibutton
                    backgroundColor="transparent"
                    borderRadius={30}
                    col={j === 1 ? 1 : (j - 2) % 3}
                    color={colorPrimary}
                    fontSize={30}
                    height={60}
                    rippleColor={colorPrimary}
                    row={j === 1 ? 4 : 1 + Math.floor((j - 2) / 3)}
                    text={j - 1}
                    variant="flat"
                    width={60}
                    on:tap={() => onButtonTap(j - 1 + '')}
                />
            {/each}
            <uibutton class="mdi" backgroundColor="transparent" borderRadius={30} col={2} fontSize={30} height={60} row={4} text="mdi-close" variant="flat" width="60" on:tap={() => clear()} />
        </gridlayout>
    {:else}
        <gridlayout on:layoutChanged={onLayoutChanged}>
            <lottie
                bind:this={lottieView}
                autoPlay={true}
                keyPathColors={{
                    'front|**': lottieDarkFColor,
                    'back|**': lottieLightColor
                }}
                loop={true}
                marginBottom={70}
                src="~/assets/lottie/fingerprint.lottie"
                width="60%"
            />
        </gridlayout>
    {/if}
</page>
