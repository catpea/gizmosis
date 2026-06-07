# Minimal Gizmo XML Example

```xml
<gizmo name="Hello Button" tag="hello-button">
  <props>
    <prop name="label" kind="text" default="Hello" reflect="true"/>
  </props>

  <events>
    <event name="hello-press"/>
  </events>

  <view>
    <button type="button" click="emit hello-press">{label}</button>
  </view>
</gizmo>
```
