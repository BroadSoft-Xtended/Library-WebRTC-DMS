# DMS

Retrieves device configuration via XSI.

Namespace : bdsft_webrtc.default.dms

## Configuration
<a name="configuration"></a>

Property                 |Type     |Default                                                              |Description
-------------------------|---------|---------------------------------------------------------------------|------------------------------------------------------------
enabled                  |boolean  |true                                                                 |True if DMS is enabled
deviceType        		|string  |Business Communicator - PC                    						|Device type to retrieve the config for


## Method
<a name="method"></a>

Method   |Parameters  |Description
---------|------------|-----------------------------
requestConfig(xsiUser, xsiPassword)  | xsiUser : string, xsiPassword : string            |Requests the device configuration
