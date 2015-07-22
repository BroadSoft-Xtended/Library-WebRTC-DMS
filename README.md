# DMS

Retrieves device configuration via XSI.

Model : bdsft_webrtc.default.dms

## Configuration
<a name="configuration"></a>

Property                 |Type     |Default                                                              |Description
-------------------------|---------|---------------------------------------------------------------------|------------------------------------------------------------
enabled                  |boolean  |true                                                                 |True if DMS is enabled
xspHosts        		|array  |['xsp1.broadsoftlabs.com', 'xsp2.broadsoftlabs.com']                    |URLs of the XSP hosts


## Method
<a name="method"></a>

Method   |Parameters  |Description
---------|------------|-----------------------------
requestConfig(xsiUser, xsiPassword)  | xsiUser : string, xsiPassword : string            |Requests the device configuration
