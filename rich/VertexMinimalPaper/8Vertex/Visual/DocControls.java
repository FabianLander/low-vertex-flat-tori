import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;

/**Documentation file*/

public class DocControls{


    public static void colorSelector(DocumentCanvas D) {

	String S="This is the color selector. You can either choose 1 of 32 preset colors or you can select the RGB and transparency values.  This color selector works in tandem with the SOL and LIE display control panels.  These display windows have a double column of buttons.  The left buttons (usually) control the colors and the right buttons (usually) toggle the display of the object.  Here is an example: Select the color yellow and then press the left button besides the 'curves' option on the SOL display window.  This will change the color of the drawn sphere to yellow.";

	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void symmetry(DocumentCanvas D) {

	String S="This option controls whether we draw the whole Sol sphere or just the portion in the positive sector. The positive sector in Sol consists of those points (x,y,z) with x and y positive.  The positive sector option is better for actually studying the sphere whereas the whole sphere option makes some really pretty pictures.";

	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void curveChoice(DocumentCanvas D) {

	String S="We draw the spheres in Sol by plotting the images of a family of curves.  This option toggles between the 3 possibilities:";
	S=S+"\n\n1. lines of longitude on the sphere.";
	S=S+"\n\n2. lines of lattitude on the sphere.";
	S=S+"\n\n3. The loop level sets on the sphere.";
	
	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void solDisplay(DocumentCanvas D) {

	String S="This control panel lets you change the displays on the Sol window.  Here are the options:";

	S=S+"\n\nbackg: This changes the window background color.";
	S=S+"\n\nSol polar:  This turns on the curves on the Sol sphere corresponding to the level sets of the function F(x,y,z)=xy.";
	S=S+"\n\nSol long:  This turns on the curves on the Sol sphere corresponding to the longitudes of the Lie algebra sphere.";
	S=S+"\n\nSol latt:  This turns on the curves on the Sol sphere corresponding to the lattitudes of the Lie algebra sphere.";
	S=S+"\n\ninner bdy:  Sometimes the domain you are plotting corresponds to an annulus on the Lie algebra sphere.  This feature turns on the curve corresponding to the inner boundary of the annulus.  When the sphere is large, the inner boundary corresponds to the singular set on the Sol sphere.";
	S=S+"\n\nouter bdy:  This feature turns on the curve corresponding to the outer boundary of the annulus.";
	
	S=S+"\n\ncritical set: This controls the display of the critical set on the Sol sphere, the place where the sphere is not smooth.";
	S=S+"\n\ngeodesic 1: This controls the display of the geodesic segment associated to the point (x,y,z) chosen on the vector window.";
	S=S+"\n\ngeodesic 2: This controls the display of the geodesic segment associated to the partner point (x,y,-z), when (x,y,z) chosen on the vector window.";
	S=S+"\n\ncut locus: This controls the display of the boundary of the image of the cut locus.  This is the set \u22020N+ from the paper.";
	S=S+"\n\ncurve fit: This controls the display of a pair of curves in the plane Z=0 which do a good of counding the projection of the Sol sphere to this plane.";
	
	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void lieDisplay(DocumentCanvas D) {

	String S="This control panel lets you change the displays on the Lie algebra window.  Here are the options:";

	S=S+"\n\nbackg: This changes the window background color.";
	S=S+"\n\ncurrent flowline: Under the Arnold/Grayson correspondence, a geodesic segment corresponds to a flowline with respect to the Hamiltonian flow for the function F(x,y,z)=xy.  The time of flowing equals the length of the geodesic.  When this feature is on, you can see the flowline corresponding to the geodesic that you have selected.";

	S=S+"\n\ncurrent level:  If this option is on, then the window also displays various data associated to the loop level set: its period, the holonomy, and the holonomy invrariant. We also print out the slope of the holonomy as a demonstration of our Reciprocity Lemma.  You can improve the accuracy of this printout (at the cost of speed) by making the integration stepsize smaller.  Things to notice:  The expressions y/x and xhol/yhol are equal, up to numerical error. Without computational error they are exactly equal. This is our Reciprocity Lemma from the paper.";
	
	S=S+"\n\nyinyang curve: The name comes from the appearance of the curve.  This curve consists of those points such that the differential dE maps the tangent plane to a plane which contains the vertical vector (0,0,1).  If you turn on this feature and recompute in the Sol window, you can see the image of the yinyang curve on the Sol sphere.  If you then look at the picture in the XY projection you can see the meaning of the curve.";
		
	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }

    public static void lockDisplay(DocumentCanvas D) {
	String S="This control panel lets you force certain choices on the vector selection window:";
	S=S+"\n\nnone: no choices forced.";
	S=S+"\n\nZ=0: Coerces the point to lie in the plane Z=0";
	S=S+"\n\ngo to critical: Coerces the point to lie on the critical level set.";
	S=S+"\n\nlength=critical: Sets the sphere radius to the critical value \u03C0 \u221A 2.  This is the first value where the Sol sphere is not smooth.";
	S=S+"\n\nlength=period: Sets the sphere radius to equal the period of the loop level set containing the currently chosen point.";
	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void step(DocumentCanvas D) {
	String S="This slider controls the accuracy of the plot. The smaller number the more accurate the plot and the longer it takes.";
    	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void tracer(DocumentCanvas D) {
	String S="This starts an animation in which the chosen point in the vector window travels around the current level set of the function F(x,y,z)=xy.  Note that the motion does not correspond to the Hamiltonian flow.  We just parametrize this level set in a convenient way and then go around it.  It is most interesting to run this feature when the sphere is large, and to take the level set to be the innermost one.  This is the critical level set. You can then see how the Riemannian exponential map maps this level in a two to one fashion onto the singular set of the Sol sphere.  If you want to choose a new level to watch, you need to stop and then restart the animation.";

    	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void viewLock(DocumentCanvas D) {
	String S="Both the Sol window and the vector selection window have pitch and yaw sliders which control the angle from which you view things.  This control panel makes it possible to sync the two systems, so that a movement in one forces the same movement in the other.";
    	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


    public static void triangleTheorem(DocumentCanvas D) {

	String S="This control panel lets you change the displays of various quantities associated to the Bounding Triangle Theorem in the paper.  The various objects have the same names in the paper.  It is best just to click on these buttons and see what they control.   The slider controls which curve you place the triangle around.";
	
	try  {DocumentCanvas.setText(D,S);}
	catch(Exception e) {}
    }


}

